"""Unit tests for QR image generation with visual enhancements."""

import io
import time
from unittest.mock import MagicMock, patch

import pytest
import qrcode
from PIL import Image

from app.handlers import _make_qr_image


class _BufferedInputFileFake:
    def __init__(self, file: bytes, filename: str, chunk_size: int | None = None):
        self.data = file
        self.file = file
        self.filename = filename
        self.chunk_size = chunk_size


def _image_bytes(qr_file) -> bytes:
    data = getattr(qr_file, "data", None)
    if isinstance(data, bytes):
        return data

    file_data = getattr(qr_file, "file", None)
    if isinstance(file_data, bytes):
        return file_data

    return b""


class TestQRImageGeneration:
    """Test QR image generation functionality."""

    @pytest.fixture(autouse=True)
    def _patch_buffered_input_file(self):
        with patch("app.utils.qr_codes.BufferedInputFile", _BufferedInputFileFake):
            yield

    def test_make_qr_image_basic(self):
        qr_file = _make_qr_image(123, "ABC12345")

        assert qr_file.filename == "customer-card-123.png"
        assert hasattr(qr_file, "data")

        image = Image.open(io.BytesIO(_image_bytes(qr_file)))
        assert image.mode == "RGB"
        assert image.size[0] > 100
        assert image.size[1] > 100

    @patch("app.handlers.get_settings")
    def test_make_qr_image_environment_watermarks(self, mock_settings):
        for environment in ("development", "testing", "production"):
            mock_settings.return_value.environment = environment
            qr_file = _make_qr_image(123, "ABC12345")
            image = Image.open(io.BytesIO(_image_bytes(qr_file)))
            assert image.mode == "RGB"
            assert image.size[0] > 100

    def test_make_qr_image_different_tokens(self):
        for token in ("ABC12345", "DEF67890", "GHI11111"):
            qr_file = _make_qr_image(123, token)
            image = Image.open(io.BytesIO(_image_bytes(qr_file)))
            assert image.mode == "RGB"
            assert image.size[0] > 100

    def test_make_qr_image_different_customers(self):
        for customer_id in (1, 123, 999999):
            qr_file = _make_qr_image(customer_id, "ABC12345")
            assert qr_file.filename == f"customer-card-{customer_id}.png"
            image = Image.open(io.BytesIO(_image_bytes(qr_file)))
            assert image.mode == "RGB"
            assert image.size[0] > 100

    def test_make_qr_image_consistency(self):
        qr_file1 = _make_qr_image(123, "ABC12345")
        qr_file2 = _make_qr_image(123, "ABC12345")

        image1 = Image.open(io.BytesIO(_image_bytes(qr_file1)))
        image2 = Image.open(io.BytesIO(_image_bytes(qr_file2)))

        assert image1.mode == "RGB"
        assert image2.mode == "RGB"
        assert image1.size == image2.size

    def test_make_qr_image_size_reasonableness(self):
        qr_file = _make_qr_image(123, "ABC12345")
        image = Image.open(io.BytesIO(_image_bytes(qr_file)))

        assert 200 <= image.size[0] <= 1000
        assert 200 <= image.size[1] <= 1000
        assert abs(image.size[0] - image.size[1]) <= 50

    def test_make_qr_image_file_size(self):
        qr_file = _make_qr_image(123, "ABC12345")
        file_size = len(_image_bytes(qr_file))
        assert 1_000 <= file_size <= 500_000

    @patch("app.utils.qr_codes.qrcode.QRCode")
    def test_make_qr_image_qr_parameters(self, mock_qr_code_class):
        mock_qr = MagicMock()
        mock_qr.make_image.return_value = Image.new("RGB", (420, 420), "white")
        mock_qr_code_class.return_value = mock_qr

        _make_qr_image(123, "ABC12345")

        mock_qr_code_class.assert_called_once_with(
            version=1,
            box_size=20,
            border=2,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
        )
        mock_qr.add_data.assert_called_once_with("ABC12345")
        mock_qr.make.assert_called_once_with(fit=True)

    @patch("app.utils.qr_codes.ImageDraw.Draw")
    @patch("app.utils.qr_codes.ImageFont.truetype")
    def test_make_qr_image_font_handling(self, mock_font_truetype, mock_draw):
        mock_font_truetype.side_effect = Exception("Font not found")
        mock_draw.return_value = MagicMock()

        qr_file = _make_qr_image(123, "ABC12345")
        image = Image.open(io.BytesIO(_image_bytes(qr_file)))
        assert image.mode == "RGB"

    def test_make_qr_image_error_handling(self):
        try:
            qr_file = _make_qr_image(123, "")
            assert len(_image_bytes(qr_file)) > 0
        except Exception as exc:
            pytest.fail(f"Should handle empty token gracefully: {exc}")

        try:
            qr_file = _make_qr_image(123, "A" * 100)
            assert len(_image_bytes(qr_file)) > 0
        except Exception as exc:
            pytest.fail(f"Should handle long token gracefully: {exc}")


class TestQRImageIntegration:
    """Integration tests for QR image system."""

    @pytest.fixture(autouse=True)
    def _patch_buffered_input_file(self):
        with patch("app.utils.qr_codes.BufferedInputFile", _BufferedInputFileFake):
            yield

    def test_qr_image_with_real_tokens(self):
        for index, token in enumerate(
            ("16446688", "16446689", "1644668A", "1644668B", "1644668C"),
            start=1,
        ):
            qr_file = _make_qr_image(index, token)
            image = Image.open(io.BytesIO(_image_bytes(qr_file)))
            assert image.mode == "RGB"
            assert image.size[0] > 100

    def test_qr_image_performance(self):
        start_time = time.time()
        for _ in range(10):
            qr_file = _make_qr_image(123, "ABC12345")
            image = Image.open(io.BytesIO(_image_bytes(qr_file)))
            assert image.mode == "RGB"

        duration = time.time() - start_time
        assert duration < 5.0, f"Generation too slow: {duration:.2f}s for 10 images"
