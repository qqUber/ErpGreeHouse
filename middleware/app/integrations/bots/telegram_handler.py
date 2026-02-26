import asyncio
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from asyncio import TaskGroup

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
# Try to import aiogram - may fail in some versions
try:
    from aiogram.fsm.storage.memory import MemoryStorage
except (ImportError, OSError) as e:
    # If aiogram is not available or has import issues, we'll use a placeholder
    MemoryStorage = None
    AIOGRAM_AVAILABLE = False

try:
    from aiogram.fsm.storage.redis import RedisStorage
except (ImportError, OSError) as e:
    RedisStorage = None
from ...handlers import router
from ...middlewares import ThrottleMiddleware

from ...config import get_settings
from ...storage import get_redis as get_redis_client


def create_bot() -> Bot:
    settings = get_settings()
    return Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


def create_bot_with_token(token: str) -> Bot:
    """Create a bot instance with a custom token.

    This is useful for validating bot tokens without modifying the configured bot.

    Args:
        token: The Telegram bot token to use

    Returns:
        Bot instance configured with the provided token
    """
    return Bot(
        token=token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


def create_dispatcher() -> Dispatcher:
    """
    Create dispatcher with optimized state management.
    Uses Redis storage for FSM when available for high-load scenarios.
    """
    settings = get_settings()

    # Use Redis storage for FSM in production for scalability
    # Check environment more robustly - handle None, empty, or custom values
    is_production = settings.environment and settings.environment.lower() in (
        "production",
        "prod",
    )

    # Handle case where aiogram storage is not available
    if MemoryStorage is None and RedisStorage is None:
        # No FSM storage available - create dispatcher without storage
        dp = Dispatcher()
    elif is_production:
        try:
            redis = get_redis_client()
            fsm_storage = RedisStorage(redis=redis)
        except Exception:
            # Fallback to memory storage if Redis unavailable
            fsm_storage = MemoryStorage() if MemoryStorage else None
    else:
        fsm_storage = MemoryStorage() if MemoryStorage else None

    if fsm_storage is not None:
        dp = Dispatcher(storage=fsm_storage)
    else:
        dp = Dispatcher()
    dp.message.middleware(ThrottleMiddleware(rate=0.7))
    dp.callback_query.middleware(ThrottleMiddleware(rate=0.7))
    dp.include_router(router)
    return dp


@asynccontextmanager
async def run_bot() -> AsyncGenerator[Bot, None]:  # type: ignore
    """
    Context manager for running bot with proper cleanup.
    Handles graceful shutdown with TaskGroup support.

    Uses Python 3.14+ TaskGroup for structured concurrency when available,
    providing better handling of concurrent user requests.
    """
    bot = create_bot()
    dp = create_dispatcher()

    # Python 3.11+ has TaskGroup, but structured concurrency improvements came in 3.14
    # Use sys.version_info for reliable version checking
    use_taskgroup = sys.version_info >= (3, 14)

    if use_taskgroup:
        # Python 3.14+ with native TaskGroup support
        # Use TaskGroup for structured concurrency
        async with asyncio.TaskGroup() as tg:
            polling_task = tg.create_task(dp.start_polling(bot))
            try:
                yield bot
            except asyncio.CancelledError:
                polling_task.cancel()
                raise
            finally:
                # Ensure polling is cancelled on cleanup
                polling_task.cancel()
                try:
                    await polling_task
                except asyncio.CancelledError:
                    pass
    else:
        # Fallback for Python < 3.14
        polling_task = asyncio.create_task(dp.start_polling(bot))
        try:
            yield bot
        finally:
            polling_task.cancel()
            try:
                await polling_task
            except asyncio.CancelledError:
                pass

    await bot.session.close()


class ConcurrentUserSessions:
    """
    Manages concurrent user sessions using asyncio.TaskGroup patterns.
    Optimized for high-load scenarios with Python 3.14 Task Groups.

    This class provides:
    - Per-user task isolation
    - Concurrent request handling with structured concurrency
    - Graceful error handling per user
    - Proper cancellation propagation

    For Python 3.14+, uses native TaskGroup for better error handling
    and task lifecycle management.
    """

    def __init__(self):
        self._tasks: dict[int, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        # Check for Python 3.14+ TaskGroup support
        self._has_taskgroup = hasattr(asyncio, "TaskGroup")

    async def start_user_session(self, user_id: int, coro: asyncio.Coroutine) -> None:
        """
        Start a new async session for a user.
        Cancels any existing session for this user.

        Uses structured concurrency patterns for Python 3.14+.
        """
        async with self._lock:
            # Cancel existing task if any
            if user_id in self._tasks:
                self._tasks[user_id].cancel()
                try:
                    await self._tasks[user_id]
                except asyncio.CancelledError:
                    pass

            # Create new task - use TaskGroup pattern in Python 3.14+
            if self._has_taskgroup:
                # In Python 3.14+, we can use create_task with proper context
                self._tasks[user_id] = asyncio.create_task(
                    coro, name=f"user_session_{user_id}"
                )
            else:
                self._tasks[user_id] = asyncio.create_task(coro)

    async def start_user_session_with_group(
        self, user_id: int, coro: asyncio.Coroutine, group: asyncio.TaskGroup
    ) -> asyncio.Task:
        """
        Start a user session within a TaskGroup for structured concurrency.
        Python 3.14+ preferred method for managing related tasks.

        Args:
            user_id: Unique user identifier
            coro: Coroutine to execute for this user
            group: TaskGroup to add the task to

        Returns:
            The created task
        """
        async with self._lock:
            # Cancel existing task if any
            if user_id in self._tasks:
                self._tasks[user_id].cancel()
                try:
                    await self._tasks[user_id]
                except asyncio.CancelledError:
                    pass

            # Create task within the group for proper error propagation
            task = group.create_task(coro, name=f"user_{user_id}")
            self._tasks[user_id] = task
            return task

    async def cancel_user_session(self, user_id: int) -> None:
        """Cancel a specific user's session."""
        async with self._lock:
            if user_id in self._tasks:
                self._tasks[user_id].cancel()
                try:
                    await self._tasks[user_id]
                except asyncio.CancelledError:
                    pass
                del self._tasks[user_id]

    async def wait_for_user(self, user_id: int, timeout: float = 30.0) -> Optional[any]:
        """
        Wait for user's task to complete with timeout.
        Returns task result or None on timeout/cancellation.
        """
        async with self._lock:
            task = self._tasks.get(user_id)

        if task is None:
            return None

        try:
            return await asyncio.wait_for(task, timeout=timeout)
        except asyncio.TimeoutError:
            return None
        except asyncio.CancelledError:
            return None

    async def get_user_task_status(self, user_id: int) -> Optional[str]:
        """
        Get the status of a user's task.
        Returns 'pending', 'running', 'done', or None if no task.
        """
        async with self._lock:
            task = self._tasks.get(user_id)

        if task is None:
            return None

        if task.done():
            return "done"
        elif task.cancelled():
            return "cancelled"
        else:
            return "running"

    async def cancel_all(self) -> None:
        """Cancel all active user sessions with proper cleanup."""
        async with self._lock:
            # Cancel all tasks
            for task in self._tasks.values():
                task.cancel()

            # Wait for all tasks to be cancelled
            if self._tasks:
                await asyncio.gather(
                    *[task for task in self._tasks.values()], return_exceptions=True
                )
            self._tasks.clear()


# Global instance for managing concurrent user sessions
user_sessions = ConcurrentUserSessions()
