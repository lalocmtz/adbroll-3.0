#!/usr/bin/env python3
"""Copy an exported TokXray Storage manifest to the owned Supabase project.

Credentials stay in TARGET_SUPABASE_SERVICE_ROLE_KEY (never in arguments/logs).
The private manifest is produced from the database backup, outside this repo.
Run --dry-run first; repeat runs skip objects already verified at the same size.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

SOURCE = 'https://gcntnilurlulejwwtpaa.supabase.co'
TARGET = 'https://tnqvvfpzkjwgllwdwvte.supabase.co'
ALLOWED_BUCKETS = {'videos', 'thumbnails', 'assets', 'user-library', 'generated-content'}


def object_path(item):
    bucket, path = item['bucket'], item['path']
    if bucket not in ALLOWED_BUCKETS or not path or path.startswith('/') or '..' in path.split('/'):
        raise ValueError('Unexpected storage location in manifest')
    return urllib.parse.quote(bucket + '/' + path, safe='/')


def request(url, method='GET', data=None, key=None, extra=None):
    headers = dict(extra or {})
    if key:
        headers.update({'apikey': key, 'Authorization': 'Bearer ' + key})
    return urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=headers), timeout=180)


def size_at(url, key=None):
    try:
        with request(url, method='HEAD', key=key) as response:
            return int(response.headers.get('Content-Length', '-1'))
    except urllib.error.HTTPError as error:
        if error.code in (400, 404):
            return None
        raise


def copy_object(item, key):
    path = object_path(item)
    expected = item['size']
    destination = TARGET + '/storage/v1/object/' + path
    try:
        if size_at(destination, key) == expected:
            return {'bucket': item['bucket'], 'path': item['path'], 'status': 'existing', 'bytes': expected}
        # Keep requests bounded; a caller cannot turn this into an arbitrary URL fetch.
        source = SOURCE + '/storage/v1/object/public/' + path
        with request(source) as response:
            content = response.read(expected + 1)
        if len(content) != expected:
            raise ValueError('Source size differs from backup manifest')
        checksum = hashlib.sha256(content).hexdigest()
        with request(destination, method='POST', data=content, key=key, extra={
            'Content-Type': item.get('content_type') or 'application/octet-stream',
            'x-upsert': 'false',
        }) as response:
            response.read()
        if size_at(destination, key) != expected:
            raise ValueError('Destination size verification failed')
        return {'bucket': item['bucket'], 'path': item['path'], 'status': 'copied', 'bytes': expected, 'sha256': checksum}
    except urllib.error.HTTPError as error:
        return {'bucket': item['bucket'], 'path': item['path'], 'status': 'error', 'error': 'HTTP ' + str(error.code)}
    except Exception as error:
        return {'bucket': item['bucket'], 'path': item['path'], 'status': 'error', 'error': type(error).__name__}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--workers', type=int, default=4, choices=range(1, 9))
    args = parser.parse_args()
    items = json.loads(args.manifest.read_text())
    for item in items:
        object_path(item)
        if not isinstance(item['size'], int) or item['size'] < 0 or item['size'] > 256 * 1024 * 1024:
            raise ValueError('Invalid or oversized object: review separately')
    if args.limit is not None:
        if args.limit < 1:
            raise ValueError('limit must be positive')
        items = items[:args.limit]
    print(json.dumps({'objects': len(items), 'bytes': sum(x['size'] for x in items), 'dry_run': args.dry_run}))
    if args.dry_run:
        return
    key = os.environ.get('TARGET_SUPABASE_SERVICE_ROLE_KEY')
    if not key:
        raise ValueError('TARGET_SUPABASE_SERVICE_ROLE_KEY is required')
    args.report.parent.mkdir(parents=True, exist_ok=True)
    failures = 0
    with args.report.open('a') as log, concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        os.chmod(args.report, 0o600)
        for i, result in enumerate(pool.map(lambda item: copy_object(item, key), items), 1):
            log.write(json.dumps(result, ensure_ascii=False) + '\n')
            log.flush()
            failures += result['status'] == 'error'
            if i % 50 == 0:
                print(json.dumps({'completed': i, 'failed': failures}), flush=True)
    print(json.dumps({'completed': len(items), 'failed': failures}))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
