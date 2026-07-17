"""Shared Garmin Connect helpers used by CLI scripts and Vercel Python functions."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from typing import Any

from garminconnect import Garmin


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


def sync_activities(email: str, password: str, limit: int = 50) -> dict[str, Any]:
    client = Garmin(email, password)
    client.login()

    full_name = client.get_full_name()
    activities = client.get_activities(0, limit)

    normalized = [
        normalize_activity(activity)
        for activity in activities
        if activity.get("activityId") is not None
    ]

    return {
        "profile": {
            "email": email,
            "fullName": full_name,
        },
        "activities": normalized,
    }


def gpx_points_from_xml(xml_text: str) -> list[list[float]]:
    points: list[list[float]] = []
    pattern = re.compile(
        r'<trkpt[^>]*lat="([0-9.+-]+)"[^>]*lon="([0-9.+-]+)"[^>]*>'
    )
    for match in pattern.finditer(xml_text):
        lat = float(match.group(1))
        lon = float(match.group(2))
        points.append([lat, lon])
    return points


def download_gpx_bytes(client: Garmin, activity_id: int) -> bytes | None:
    try:
        fmt = getattr(client, "ActivityDownloadFormat", None)
        if fmt is not None and hasattr(fmt, "GPX"):
            return client.download_activity(activity_id, dl_fmt=fmt.GPX)
    except Exception:
        pass

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


def fetch_route_points(
    email: str,
    password: str,
    limit: int = 20,
    activity_type: str = "running",
) -> dict[str, Any]:
    client = Garmin(email, password)
    client.login()

    activities = client.get_activities(0, max(1, limit * 2))
    run_ids: list[int] = []
    for activity in activities:
        if (
            matches_activity_type(activity, activity_type)
            and activity.get("activityId") is not None
        ):
            run_ids.append(int(activity["activityId"]))
        if len(run_ids) >= limit:
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
        heat_points.extend(gpx_points_from_xml(xml_text))

    return {
        "points": heat_points,
        "activityCount": len(run_ids),
    }
