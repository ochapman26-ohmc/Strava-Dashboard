#!/usr/bin/env python3

import argparse
import json
import sys
from typing import Any

from garminconnect import Garmin


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--limit", type=int, default=50)
    return parser.parse_args()


def normalize_activity(activity: dict[str, Any]) -> dict[str, Any]:
    activity_type = activity.get("activityType") or {}
    return {
        "id": activity.get("activityId"),
        "name": activity.get("activityName") or "Untitled activity",
        "type": activity_type.get("typeKey")
        or activity.get("activityTypeDTO", {}).get("typeKey")
        or "other",
        "distance": activity.get("distance") or 0,
        "movingTime": activity.get("movingDuration") or activity.get("duration") or 0,
        "elapsedTime": activity.get("duration") or activity.get("movingDuration") or 0,
        "totalElevationGain": activity.get("elevationGain"),
        "averageSpeed": activity.get("averageSpeed"),
        "maxSpeed": activity.get("maxSpeed"),
        "averageHeartrate": activity.get("averageHR"),
        "maxHeartrate": activity.get("maxHR"),
        "startDate": activity.get("startTimeGMT") or activity.get("startTimeLocal"),
        "startDateLocal": activity.get("startTimeLocal") or activity.get("startTimeGMT"),
        "description": activity.get("description"),
    }


def main() -> int:
    args = parse_args()

    try:
        client = Garmin(args.email, args.password)
        client.login()

        full_name = client.get_full_name()
        activities = client.get_activities(0, args.limit)

        normalized = [
            normalize_activity(activity)
            for activity in activities
            if activity.get("activityId") is not None
        ]

        payload = {
            "profile": {
                "email": args.email,
                "fullName": full_name,
            },
            "activities": normalized,
        }

        print(json.dumps(payload))
        return 0
    except Exception as error:  # noqa: BLE001
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
