# -*- coding: utf-8 -*-
"""
紫微斗数推算 (Ziwei Doushu Calculator)

依赖: iztro-py (pip install iztro-py)

Usage:
  python scripts/ziwei_calc.py 1990-05-15 --gender male --hour 15
  python scripts/ziwei_calc.py 1990-05-15 --gender male --hour 15 --json
"""

import sys, json

def calculate(birth_date, gender='male', hour=12):
    """Offline cross-check using the current iztro-py API."""
    try:
        from iztro_py import by_solar
    except ImportError:
        return {'error': 'iztro-py offline oracle is not installed. Run the complete setup.'}

    try:
        year, month, day = [int(part) for part in birth_date.split('-')]
        time_index = ((int(hour) + 1) // 2) % 12
        gender_key = '男' if gender == 'male' else '女'
        result = by_solar(f'{year}-{month}-{day}', time_index, gender_key)
        palaces = []
        for palace in getattr(result, 'palaces', []):
            stars = list(getattr(palace, 'major_stars', [])) + list(getattr(palace, 'minor_stars', []))
            palaces.append({
                'name': str(getattr(palace, 'name', '')),
                'stars': [
                    {'name': str(getattr(star, 'name', '')), 'brightness': str(getattr(star, 'brightness', '') or '')}
                    for star in stars
                ],
            })
        soul_palace = result.get_soul_palace() if hasattr(result, 'get_soul_palace') else None
        body_palace = result.get_body_palace() if hasattr(result, 'get_body_palace') else None
        return {
            'birth_date': birth_date,
            'gender': gender,
            'minggong': str(getattr(soul_palace, 'name', '') or ''),
            'shenggong': str(getattr(body_palace, 'name', '') or ''),
            'palaces': palaces,
            'day_stem': '',
            'day_branch': '',
        }
    except Exception as e:
        return {'error': f'Calculation failed: {str(e)}'}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='紫微斗数推算 (Ziwei Calculator)')
    parser.add_argument('birth_date', help='Birth date (YYYY-MM-DD)')
    parser.add_argument('--gender', choices=['male', 'female'], default='male', help='Gender')
    parser.add_argument('--hour', type=int, default=12, help='Birth hour (0-23)')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    result = calculate(args.birth_date, args.gender, args.hour)

    if 'error' in result:
        print(f'ERROR: {result["error"]}')
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f'=== 紫微斗数排盘 ===')
        print(f'出生: {result["birth_date"]} 性别: {"男" if args.gender == "male" else "女"}')
        print(f'命宫: {result.get("minggong", "")}')
        print(f'身宫: {result.get("shenggong", "")}')
        print(f'\n十二宫:')
        for p in result.get('palaces', [])[:6]:
            star_names = ', '.join([s['name'] for s in p.get('stars', [])[:3]])
            print(f'  {p["name"]}: {star_names}')


if __name__ == '__main__':
    main()
