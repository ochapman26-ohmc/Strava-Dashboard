#!/usr/bin/env python3

import argparse
import json
import sys
import tempfile
import zipfile
from io import BytesIO
from typing import Any

from garminconnect import Garmin


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--activity-type", default="running")
    return parser.parse_args()


def gpx_points_from_xml(xml_text: str) -> list[list[float]]:
    points: list[list[float]] = []
    # very small GPX parser: only extracts <trkpt lat=".." lon="..">
    # avoids extra deps
    import re

    pattern = re.compile(r"<trkpt[^>]*lat=\"([0-9.+-]+)\"[^>]*lon=\"([0-9.+-]+)\"[^>]*>")
    for match in pattern.finditer(xml_text):
        lat = float(match.group(1))
        lon = float(match.group(2))
        points.append([lat, lon])
    return points


def download_gpx_bytes(client: Garmin, activity_id: int) -> bytes | None:
    # Newer garminconnect versions expose an enum; to avoid version pinning,
    # try a few download formats.
    try:
        fmt = getattr(client, "ActivityDownloadFormat", None)
        if fmt is not None and hasattr(fmt, "GPX"):
            return client.download_activity(activity_id, dl_fmt=fmt.GPX)
    except Exception:
        pass

    # Fall back to ORIGINAL (zip) and look for gpx inside.
    try:
        fmt = getattr(client, "ActivityDownloadFormat", None)
        if fmt is not None and hasattr(fmt, "ORIGINAL"):
            original = client.download_activity(activity_id, dl_fmt=fmt.ORIGINAL)
            with zipfile.ZipFile(BytesIO(original)) as zf:
                for name in zf.namelist():
                    if name.lower().endswith(".gpx"):
                        return zf.read(name)
    except Exception:
        pass

    return None


def matches_activity_type(activity: dict[str, Any], activity_type: str) -> bool:
    activity_type_obj = activity.get("activityType") or {}
    type_key = activity_type_obj.get("typeKey") or ""
    if not activity_type:
        return True
    return type_key.lower() == activity_type.lower()


def main() -> int:
    args = parse_args()

    try:
        client = Garmin(args.email, args.password)
        client.login()

        activities = client.get_activities(0, max(1, args.limit * 2))
        run_ids: list[int] = []
        for activity in activities:
            if matches_activity_type(activity, args.activity_type) and activity.get("activityId") is not None:
                run_ids.append(int(activity["activityId"]))
            if len(run_ids) >= args.limit:
                break

        heat_points: list[list[float]] = []

        for activity_id in run_ids:
            gpx_bytes = download_gpx_bytes(client, activity_id)
            if not gpx_bytes:
                continue

            try:
                xml_text = gpx_bytes.decode("utf-8", errors="ignore")
            except Exception:
                continue

            points = gpx_points_from_xml(xml_text)
            heat_points.extend(points)

        payload = {
            "points": heat_points,  # [[lat, lon], ...]
            "activityCount": len(run_ids),
        }
        print(json.dumps(payload))
        return 0
    except Exception as error:  # noqa: BLE001
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
