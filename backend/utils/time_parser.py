"""
Time Expression Parser

Detects and extracts explicit time preferences from user messages.
Used to ensure user-specified times are prioritized over general preferences.
"""

import re
from typing import Optional, Dict, List, Tuple
from datetime import datetime


class TimeExpressionParser:
    """
    Parses natural language time expressions from user messages.

    Detects patterns like:
    - "from 3 to 4"
    - "3-4pm"
    - "at 2pm"
    - "between 9 and 11"
    - "starting at 3"
    """

    # Regex patterns for different time expression formats
    PATTERNS = [
        # "from 3pm to 4pm", "from 3 to 4", "from 15:00 to 16:00"
        (
            r'from\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?',
            'from_to'
        ),
        # "3pm to 4pm", "3 to 4", "15:00 to 16:00"
        (
            r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?',
            'range_to'
        ),
        # "3-4pm", "3-4", "15:00-16:00", "9am-11am"
        (
            r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?',
            'range_dash'
        ),
        # "between 3pm and 4pm", "between 3 and 4"
        (
            r'between\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+and\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?',
            'between_and'
        ),
        # "at 2pm", "at 14:00"
        (
            r'at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?',
            'at_time'
        ),
    ]

    @staticmethod
    def _normalize_hour(hour: str, minute: str, meridiem: Optional[str]) -> str:
        """
        Convert hour to 24-hour format string (HH:MM).

        Args:
            hour: Hour string (1-12 or 0-23)
            minute: Minute string (00-59), defaults to "00"
            meridiem: "am" or "pm", None if 24-hour format

        Returns:
            Normalized time string in HH:MM format
        """
        hour_int = int(hour)
        minute_int = int(minute) if minute else 0

        if meridiem:
            meridiem_lower = meridiem.lower()
            if meridiem_lower == 'pm' and hour_int != 12:
                hour_int += 12
            elif meridiem_lower == 'am' and hour_int == 12:
                hour_int = 0

        return f"{hour_int:02d}:{minute_int:02d}"

    @staticmethod
    def parse(message: str) -> Optional[Dict[str, any]]:
        """
        Parse time expressions from a message.

        Args:
            message: User message text

        Returns:
            Dictionary with detected time info, or None if no time detected:
            {
                "detected": True,
                "start_time": "15:00",
                "end_time": "16:00",
                "confidence": "high",
                "matched_text": "from 3 to 4",
                "pattern_type": "from_to"
            }
        """
        message_lower = message.lower()

        for pattern, pattern_type in TimeExpressionParser.PATTERNS:
            match = re.search(pattern, message_lower, re.IGNORECASE)
            if match:
                groups = match.groups()

                if pattern_type == 'at_time':
                    # Single time point - assume 1 hour duration
                    hour, minute, meridiem = groups[0], groups[1], groups[2]
                    start_time = TimeExpressionParser._normalize_hour(hour, minute, meridiem)

                    # Add 1 hour for end time
                    start_hour = int(start_time.split(':')[0])
                    end_hour = (start_hour + 1) % 24
                    end_time = f"{end_hour:02d}:{start_time.split(':')[1]}"

                    return {
                        "detected": True,
                        "start_time": start_time,
                        "end_time": end_time,
                        "confidence": "medium",  # Lower confidence for single time
                        "matched_text": match.group(0),
                        "pattern_type": pattern_type
                    }
                else:
                    # Time range
                    start_hour, start_min, start_meridiem = groups[0], groups[1], groups[2]
                    end_hour, end_min, end_meridiem = groups[3], groups[4], groups[5]

                    # If end time has no meridiem but start does, inherit it
                    # e.g., "3pm to 4" should be "3pm to 4pm"
                    if start_meridiem and not end_meridiem:
                        # If end hour is less than start hour, likely crossed meridiem
                        # e.g., "11am to 1" is "11am to 1pm"
                        if int(end_hour) < int(start_hour):
                            end_meridiem = 'pm' if start_meridiem.lower() == 'am' else 'am'
                        else:
                            end_meridiem = start_meridiem

                    start_time = TimeExpressionParser._normalize_hour(
                        start_hour, start_min, start_meridiem
                    )
                    end_time = TimeExpressionParser._normalize_hour(
                        end_hour, end_min, end_meridiem
                    )

                    # Validate that end > start
                    start_minutes = int(start_time.split(':')[0]) * 60 + int(start_time.split(':')[1])
                    end_minutes = int(end_time.split(':')[0]) * 60 + int(end_time.split(':')[1])

                    if end_minutes <= start_minutes:
                        # Invalid range, skip this match
                        continue

                    return {
                        "detected": True,
                        "start_time": start_time,
                        "end_time": end_time,
                        "confidence": "high",
                        "matched_text": match.group(0),
                        "pattern_type": pattern_type
                    }

        return None


def extract_time_preference(message: str) -> Optional[str]:
    """
    Extract time preference from message and return formatted tag.

    Args:
        message: User message text

    Returns:
        Formatted tag to prepend to message, or None if no time detected.
        Example: "[DETECTED_TIME_PREFERENCE: 15:00-16:00]"
    """
    result = TimeExpressionParser.parse(message)

    if result and result["detected"]:
        start = result["start_time"]
        end = result["end_time"]
        confidence = result["confidence"]

        return f"[DETECTED_TIME_PREFERENCE: {start}-{end} (confidence: {confidence})]"

    return None


# Example usage and tests
if __name__ == "__main__":
    test_cases = [
        "Can you schedule this from 3 to 4?",
        "I want to work 9am-11am tomorrow",
        "Put this at 2pm please",
        "Schedule between 15:00 and 17:00",
        "from 3pm to 4pm works for me",
        "Let's do 3-4 today",
        "I'm free 11am to 1pm",
    ]

    print("Testing Time Expression Parser:\n")
    for test in test_cases:
        result = TimeExpressionParser.parse(test)
        tag = extract_time_preference(test)

        print(f"Input: {test}")
        if result:
            print(f"  [OK] Detected: {result['start_time']} to {result['end_time']}")
            print(f"    Pattern: {result['pattern_type']}, Confidence: {result['confidence']}")
            print(f"    Tag: {tag}")
        else:
            print(f"  [--] No time expression detected")
        print()
