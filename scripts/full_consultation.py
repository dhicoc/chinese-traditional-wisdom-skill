# -*- coding: utf-8 -*-
"""
Full Consultation Pipeline — 全链路咨询编排
顺序调用各引擎生成综合咨询报告。

Usage:
  python scripts/full_consultation.py 1990-05-15 --gender male --hour 15
  python scripts/full_consultation.py 1990-05-15 --json
"""
import sys, json, os, subprocess

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def run_script(name, args):
    path = os.path.join(SCRIPTS_DIR, name)
    if not os.path.exists(path):
        return {'error': 'Script not found: ' + path}
    try:
        cmd = [sys.executable, path] + args + ['--json']
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
        return {'error': r.stderr[:200] if r.stderr else 'unknown error'}
    except Exception as e:
        return {'error': str(e)}

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Full consultation pipeline')
    parser.add_argument('birth_date', help='Birth date (YYYY-MM-DD)')
    parser.add_argument('--gender', choices=['male', 'female'], default='male')
    parser.add_argument('--hour', type=int, default=12, help='Birth hour (0-23)')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    bazi_args = [args.birth_date, '--gender', args.gender, '--hour', str(args.hour)]
    yunqi_args = [args.birth_date.split('-')[0]]

    sys.stderr.write('[1/2] Calculating BaZi...\n')
    bazi = run_script('bazi_calc.py', bazi_args)

    sys.stderr.write('[2/2] Calculating WuYun-LiuQi...\n')
    yunqi = run_script('yunqi_calc.py', yunqi_args)

    gender_cn = chr(30007) if args.gender == 'male' else chr(22899)

    report = {
        'input': {
            'birth_date': args.birth_date,
            'gender': gender_cn,
            'hour': args.hour,
        },
        'bazi': bazi if 'error' not in bazi else {'error': bazi['error']},
        'yunqi': yunqi if 'error' not in yunqi else {'error': yunqi['error']},
    }

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        b = report['bazi']
        y = report['yunqi']
        print()
        print('=== Full Consultation Report ===')
        print('Birth:', args.birth_date, 'Gender:', gender_cn)
        if 'error' not in b:
            print('BaZi:', b.get('bazi', 'N/A'))
            print('Elements:', json.dumps(b.get('elements', {}), ensure_ascii=False))
        if 'error' not in y:
            print('Year Fortune:', y.get('dayun_display', 'N/A'))
        print()
        print('* This report is AI-generated for traditional culture learning only *')

if __name__ == '__main__':
    main()
