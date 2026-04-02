"""
Abstract base class for bot platform adapters.

This module defines the interface that both VK and Telegram handlers
must implement to use the shared framework. Platform-specific code
remains separate while common business logic is centralized.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict

from .consent import get_customer_consents
from .keys import consent_key, registration_key
from .registration import RegistrationFlow
from .sources import Source


class BaseBotAdapter(ABC):
    """
    Abstract base class for bot platform adapters.

    This class defines the interface that VK and Telegram handlers
    must implement. It provides common functionality while allowing
    platform-specific implementations for message sending and keyboard formatting.
    """

    # Platform source identifier (to be set by subclasses)
    SOURCE: Source

    def __init__(self):
        """Initialize the bot adapter."""
        self.registration_flow = RegistrationFlow(self.SOURCE)

    @property
    def source(self) -> Source:
        """Get the platform source."""
        return self.SOURCE

    # =========================================================================
    # Abstract methods - must be implemented by subclasses
    # =========================================================================

    @abstractmethod
    def send_message(self, user_id: int, text: str, **kwargs: Any) -> Any:
        """
        Send a message to the user.

        Args:
            user_id: The platform user ID
            text: Message text
            **kwargs: Additional platform-specific parameters (e.g., keyboard)

        Returns:
            Platform-specific response
        """

    @abstractmethod
    def format_keyboard(self, keyboard_type: str) -> Any:
        """
        Format a keyboard for the platform.

        Args:
            keyboard_type: Type of keyboard ('consent', 'marketing')

        Returns:
            Platform-specific keyboard object
        """

    # =========================================================================
    # Common methods - can be used by all platform adapters
    # =========================================================================

    def get_consent_key(self, user_id: int) -> str:
        """
        Get the Redis key for consent state.

        Args:
            user_id: The platform user ID

        Returns:
            Redis key string
        """
        return consent_key(self.source, user_id)

    def get_registration_key(self, user_id: int) -> str:
        """
        Get the Redis key for registration data.

        Args:
            user_id: The platform user ID

        Returns:
            Redis key string
        """
        return registration_key(self.source, user_id)

    def is_in_registration_flow(self, user_id: int) -> bool:
        """
        Check if user is in an active registration flow.

        Args:
            user_id: The platform user ID

        Returns:
            True if user has consent_given=1 in Redis
        """
        return self.registration_flow.is_in_registration_flow(user_id)

    def get_registration_data(self, user_id: int) -> Dict[str, str]:
        """
        Get current registration data from Redis.

        Args:
            user_id: The platform user ID

        Returns:
            Dict with registration data
        """
        return self.registration_flow.get_registration_data(user_id)

    def get_customer_consents(self, user_id: int) -> Dict[str, bool]:
        """
        Get customer consent status.

        Args:
            user_id: The platform user ID

        Returns:
            Dict with marketing_allowed and data_processing_allowed
        """
        return get_customer_consents(self.source, user_id)

    # =========================================================================
    # Command handlers - use shared business logic, call platform methods
    # =========================================================================

    async def handle_start(self, user_id: int) -> None:
        """
        Handle /start command.

        Checks if user is registered and shows appropriate message.

        Args:
            user_id: The platform user ID
        """
        from .commands import is_registered

        if is_registered(self.source, user_id):
            await self._send_welcome_back(user_id)
        else:
            await self._send_consent_request(user_id)

    async def handle_subscribe(self, user_id: int) -> None:
        """
        Handle /subscribe command - opt in to marketing.

        Args:
            user_id: The platform user ID
        """
        from .commands import cmd_subscribe

        cmd_subscribe(self.source, user_id, lambda msg: self.send_message(user_id, msg))

    async def handle_revoke_consent(self, user_id: int) -> None:
        """
        Handle /revoke_consent command - opt out of marketing.

        Args:
            user_id: The platform user ID
        """
        from .commands import cmd_revoke_consent

        cmd_revoke_consent(
            self.source, user_id, lambda msg: self.send_message(user_id, msg)
        )

    async def handle_profile(self, user_id: int) -> None:
        """
        Handle /profile command - show user profile.

        Args:
            user_id: The platform user ID
        """
        from .commands import cmd_profile

        cmd_profile(self.source, user_id, lambda msg: self.send_message(user_id, msg))

    async def handle_consent_agree(self, user_id: int) -> None:
        """
        Handle user agreeing to consent - start registration flow.

        Args:
            user_id: The platform user ID
        """
        self.registration_flow.start_registration(user_id)
        self.send_message(user_id, "Согласие принято! ✅\n\nКак тебя зовут? (Имя)")

    async def handle_consent_refuse(self, user_id: int) -> None:
        """
        Handle user refusing consent - cleanup data per 152-ФЗ.

        Args:
            user_id: The platform user ID
        """
        from .consent import cleanup_user_data

        cleanup_user_data(self.source, user_id)
        self.send_message(
            user_id,
            "Вы отказались от регистрации.\n\n"
            "Ваши данные были удалены.\n"
            "Для повторной регистрации используйте /start",
        )

    async def handle_registration_message(self, user_id: int, text: str) -> None:
        """
        Handle registration flow message (name or phone input).

        Args:
            user_id: The platform user ID
            text: User's message text
        """
        if not self.is_in_registration_flow(user_id):
            return

        data = self.get_registration_data(user_id)
        step = data.get("step", "")

        if step == "name":
            # Store name and ask for phone
            self.registration_flow.store_name(user_id, text.strip())
            self.send_message(user_id, "Телефон? (Формат: +79991234567)")

        elif step == "phone":
            # Store phone and ask for marketing consent
            phone = self.registration_flow.store_phone(user_id, text.strip())
            if not phone:
                self.send_message(user_id, "Телефон должен быть в формате +79991234567")
                return

            keyboard = self.format_keyboard("marketing")
            self.send_message(
                user_id, "Хотите получать новости и акции?", keyboard=keyboard
            )

    async def handle_marketing_consent(self, user_id: int, agreed: bool) -> None:
        """
        Handle marketing consent decision.

        Args:
            user_id: The platform user ID
            agreed: True if user agreed to marketing
        """
        data = self.get_registration_data(user_id)

        if not data or not data.get("consent_given"):
            self.send_message(
                user_id,
                "Сессия регистрации истекла. Используйте /start для начала заново.",
            )
            return

        name = data.get("name", "")
        phone = data.get("phone", "")
        marketing_allowed = 1 if agreed else 0

        # Complete registration
        customer_dict, is_new = self.registration_flow.complete_registration(
            user_id, name, phone, marketing_allowed
        )

        if not customer_dict.get("id"):
            self.send_message(user_id, "Ошибка регистрации. Попробуйте /start")
            return

        # Send success message
        if marketing_allowed:
            self.send_message(
                user_id,
                "Готово! Начислено 100 приветственных баллов.\n\n"
                "Теперь вы будете получать новости и акции.\n\n"
                "Управление подпиской: /subscribe /revoke_consent",
            )
        else:
            self.send_message(
                user_id,
                "Готово! Начислено 100 приветственных баллов.\n\n"
                "Вы не будете получать рекламные сообщения.\n"
                "Подписаться: /subscribe",
            )

    # =========================================================================
    # Private helper methods
    # =========================================================================

    async def _send_welcome_back(self, user_id: int) -> None:
        """Send welcome back message to registered user."""
        consents = self.get_customer_consents(user_id)

        consent_status = ""
        if consents.get("data_processing_allowed"):
            consent_status = "\n\n✅ Обработка данных разрешена"
            if consents.get("marketing_allowed"):
                consent_status += "\n✅ Рассылки включены"
            else:
                consent_status += "\n❌ Рассылки выключены"

        self.send_message(
            user_id,
            f"С возвращением! 🏠☕\n\n"
            f"Рады видеть вас снова!{consent_status}\n\n"
            f"Управление подпиской: /subscribe /revoke_consent",
        )

    async def _send_consent_request(self, user_id: int) -> None:
        """Send consent request to new user."""
        self.send_message(user_id, "Добро пожаловать в GreenHouse! 🏠☕")
        keyboard = self.format_keyboard("consent")
        self.send_message(
            user_id, "Для регистрации необходимо принять условия:", keyboard=keyboard
        )
