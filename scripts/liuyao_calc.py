# -*- coding: utf-8 -*-
"""
六爻占卜推算 (Liuyao / Six Lines Divination Calculator)

依赖: ichingshifa (pip install ichingshifa)

Usage:
  python scripts/liuyao_calc.py "今日财运如何"
  python scripts/liuyao_calc.py "今日财运如何" --json
  python scripts/liuyao_calc.py --random
"""

import sys, json, random

def calculate(question=None, random_mode=False):
    """Perform Liuyao divination using ichingshifa."""
    try:
        from ichingshifa.ichingshifa import Iching
    except ImportError:
        return {'error': 'optional ichingshifa oracle is not installed; see requirements-optional-liuyao.txt'}

    try:
        # ichingshifa 3.x exposes an Iching class. This historical helper uses
        # the package's local time-based oracle for both modes; the question is
        # display context only and is never an authoritative Agent calculation.
        oracle = Iching()
        hex_data = oracle.qigua_now()

        result = {
            'question': question or '(random)',
            'hexagram_name': getattr(hex_data, 'name', str(hex_data)) if hasattr(hex_data, 'name') else str(hex_data),
        }

        # Extract hexagram details
        if hasattr(hex_data, 'original'):
            result['original_hexagram'] = hex_data.original
        if hasattr(hex_data, 'changing'):
            result['changing_lines'] = hex_data.changing
        if hasattr(hex_data, 'judgment'):
            result['judgment'] = hex_data.judgment
        if hasattr(hex_data, 'yao_text'):
            result['yao_text'] = hex_data.yao_text

        return result
    except Exception as e:
        return {'error': f'Calculation failed: {str(e)}'}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='六爻占卜 (Liuyao Divination)')
    parser.add_argument('question', nargs='?', default=None, help='Question to ask')
    parser.add_argument('--random', action='store_true', help='Generate random hexagram')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    if not args.question and not args.random:
        parser.print_help()
        print('\nPlease provide a question or use --random')
        sys.exit(1)

    result = calculate(args.question, args.random)

    if 'error' in result:
        print(f'ERROR: {result["error"]}')
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f'=== 六爻占卜 ===')
        print(f'问题: {result.get("question", "随机起卦")}')
        print(f'卦名: {result.get("hexagram_name", "N/A")}')
        if 'judgment' in result:
            print(f'卦辞: {result["judgment"][:100]}')


if __name__ == '__main__':
    main()
