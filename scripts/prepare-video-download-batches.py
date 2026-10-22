#!/usr/bin/env python3
"""Prepare resumable provider inputs from our normalized Kalodata export. No API calls."""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlsplit


def prepare(payload, limit=100, batch_size=100):
    if limit < 1 or not 1 <= batch_size <= 100:
        raise ValueError('Use a positive limit and batches of 1–100 videos')
    selected, seen = [], set()
    for row in sorted(payload['videos'], key=lambda row: row.get('rank') or 10**9):
        url = urlsplit(row['video_url'])
        match = re.fullmatch(r'/@[^/]+/video/(\d+)/?', url.path)
        if url.scheme != 'https' or url.hostname not in ('www.tiktok.com', 'tiktok.com') or not match:
            raise ValueError('Invalid canonical TikTok URL in import')
        video_id = match.group(1)
        if video_id != str(row['tiktok_video_id']):
            raise ValueError('Video ID differs from source URL')
        if video_id in seen:
            continue
        seen.add(video_id)
        selected.append({
            'video_id': video_id,
            'url': 'https://www.tiktok.com' + url.path.rstrip('/'),
            'product_id': row.get('tiktok_product_id'),
            'rank': row.get('rank'),
            'duration_seconds': row.get('duration'),
        })
        if len(selected) == limit:
            break
    batches = []
    for offset in range(0, len(selected), batch_size):
        batches.append({
            'postURLs': [row['url'] for row in selected[offset:offset+batch_size]],
            'scrapeRelatedVideos': False,
            'shouldDownloadVideos': True,
            'shouldDownloadCovers': False,
            'shouldDownloadSlideshowImages': False,
            'shouldDownloadSubtitles': False,
            'shouldDownloadAvatars': False,
        })
    return selected, batches


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('payload', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--limit', type=int, default=100)
    parser.add_argument('--batch-size', type=int, default=100)
    args = parser.parse_args()
    selected, batches = prepare(json.loads(args.payload.read_text()), args.limit, args.batch_size)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output/'manifest.json').write_text(json.dumps(selected, ensure_ascii=False, indent=2))
    (args.output/'urls.txt').write_text('\n'.join(row['url'] for row in selected)+'\n')
    for number, batch in enumerate(batches, 1):
        (args.output/f'apify-{number:03}.json').write_text(json.dumps(batch, indent=2))
    print(json.dumps({'videos': len(selected), 'batches': len(batches), 'network_calls': 0}))
