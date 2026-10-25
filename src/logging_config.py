"""
NewsPulse AI — Structured Logging & Diagnostics
Provides formatted logging with automatic sanitization of AWS credentials and tokens.
"""

import logging
import sys
import re

SENSITIVE_PATTERNS = [
    re.compile(r'(aws_secret_access_key\s*[:=]\s*)([^\s,]+)', re.IGNORECASE),
    re.compile(r'(aws_access_key_id\s*[:=]\s*)([^\s,]+)', re.IGNORECASE),
    re.compile(r'(AKIA[0-9A-Z]{16})', re.IGNORECASE),
    re.compile(r'(password\s*[:=]\s*)([^\s,]+)', re.IGNORECASE),
]


class SanitizingFormatter(logging.Formatter):
    """Custom logging formatter that scrubs potential keys or credentials."""
    def format(self, record: logging.LogRecord) -> str:
        original = super().format(record)
        sanitized = original
        for pattern in SENSITIVE_PATTERNS:
            sanitized = pattern.sub(r'\1[REDACTED]', sanitized)
        return sanitized


def setup_logger(name: str = "newspulse", level: int = logging.INFO) -> logging.Logger:
    """Configures and returns a sanitized logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(level)
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = SanitizingFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False
    return logger


logger = setup_logger()
