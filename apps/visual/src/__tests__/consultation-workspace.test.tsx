import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsultationWorkspace } from '@/features/consultation/ConsultationWorkspace';
import { TOOL_WORKSPACE_MAP } from '@/features/consultation/wizardFieldRegistry';
import { BirthProvider } from '@/lib/birthContext';
import { LOCAL_TOOL_NAMES } from '@/legacy/localToolRegistry';

function renderWizard(onSelectModule = vi.fn()) {
  render(<BirthProvider><ConsultationWorkspace activeModule="consult" onSelectModule={onSelectModule} /></BirthProvider>);
  return onSelectModule;
}

afterEach(() => localStorage.clear());

describe('unified consultation wizard', () => {
  it('plans a Bazi request, requires civil confirmation, and renders verified facts', () => {
    renderWizard();
    fireEvent.change(screen.getByTestId('consultation-query'), { target: { value: '我想了解事业方向' } });
    fireEvent.click(screen.getByRole('button', { name: '生成本地方案' }));
    expect(screen.getByText('bazi_calculate')).toBeInTheDocument();
    const form = screen.getByTestId('consultation-bazi-form');
    fireEvent.click(within(form).getByRole('button', { name: '运行本地八字计算' }));
    expect(screen.getByRole('alert')).toHaveTextContent('确认本次按民用出生记录');
    fireEvent.click(within(form).getByLabelText('确认使用民用时间'));
    fireEvent.click(within(form).getByRole('button', { name: '运行本地八字计算' }));
    const result = screen.getByTestId('consultation-result');
    expect(within(result).getByText('已核验结构化结果')).toBeInTheDocument();
    expect(within(result).getByText('年柱')).toBeInTheDocument();
    expect(within(result).getByText(/facts verified/)).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it('keeps a classical knowledge request tool-free and hands it to the reader', () => {
    const onSelect = renderWizard();
    fireEvent.change(screen.getByTestId('consultation-query'), { target: { value: '庄子怎么看焦虑' } });
    fireEvent.click(screen.getByRole('button', { name: '生成本地方案' }));
    expect(screen.getByText('本次不需要排盘工具')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '打开古籍阅读' }));
    expect(onSelect).toHaveBeenCalledWith('reader');
  });

  it('executes Feixing, Bazhai, and Almanac directly with transient forms', async () => {
    renderWizard();
    for (const scenario of [
      { query: '流年飞星 2026', tool: 'calc_feixing', form: 'consultation-feixing-form', action: '运行本地飞星计算' },
      { query: '八宅卧室方位布局', tool: 'calc_bazhai', form: 'consultation-bazhai-form', action: '运行本地八宅计算' },
      { query: '2026-08-22 黄历宜忌', tool: 'get_almanac', form: 'consultation-almanac-form', action: '运行本地黄历计算' },
    ]) {
      fireEvent.change(screen.getByTestId('consultation-query'), { target: { value: scenario.query } });
      fireEvent.click(screen.getByRole('button', { name: '生成本地方案' }));
      expect(screen.getByText(scenario.tool)).toBeInTheDocument();
      fireEvent.click(within(screen.getByTestId(scenario.form)).getByRole('button', { name: scenario.action }));
      expect(await screen.findByTestId('consultation-result')).toHaveTextContent('facts verified');
    }
    expect(localStorage.length).toBe(0);
  });

  it('hands unsupported direct-execution candidates to their existing workspace', () => {
    const onSelect = renderWizard();
    fireEvent.change(screen.getByTestId('consultation-query'), { target: { value: '奇门遁甲排盘' } });
    fireEvent.click(screen.getByRole('button', { name: '生成本地方案' }));
    expect(screen.getByText('arrange_qimen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '打开奇门遁甲' }));
    expect(onSelect).toHaveBeenCalledWith('qimen');
  });


  it('executes name, dream, character, and rhythm tools without persisting inputs', async () => {
    renderWizard();
    const scenarios = [
      { query: '姓名起名分析', tool: 'analyze_name', form: 'consultation-name-form', fields: [['向导姓氏', '山'], ['向导名字', '河']], action: '运行本地姓名评分' },
      { query: '梦见蛇 解梦', tool: 'dream_interpret', form: 'consultation-dream-form', fields: [['向导梦象关键词', '蛇']], action: '运行本地梦象检索' },
      { query: '测字 明', tool: 'cast_cezi', form: 'consultation-cezi-form', fields: [['向导测字汉字', '明']], action: '运行本地测字' },
      { query: '子午流注 时辰经络', tool: 'get_daily_rhythm', form: 'consultation-rhythm-form', fields: [['向导节律日期', '2026-08-22'], ['向导节律小时', '9']], action: '运行本地节律计算' },
    ];
    for (const scenario of scenarios) {
      fireEvent.change(screen.getByTestId('consultation-query'), { target: { value: scenario.query } });
      fireEvent.click(screen.getByRole('button', { name: '生成本地方案' }));
      expect(screen.getByText(scenario.tool)).toBeInTheDocument();
      const form = screen.getByTestId(scenario.form);
      for (const [label, value] of scenario.fields) fireEvent.change(within(form).getByLabelText(label), { target: { value } });
      fireEvent.click(within(form).getByRole('button', { name: scenario.action }));
      expect(await screen.findByTestId('consultation-result')).toHaveTextContent('facts verified');
    }
    expect(localStorage.length).toBe(0);
  });

  it('keeps the tool-to-workspace transfer map exhaustive for all 32 tools', () => {
    expect(new Set(Object.keys(TOOL_WORKSPACE_MAP))).toEqual(new Set(LOCAL_TOOL_NAMES));
    expect(Object.keys(TOOL_WORKSPACE_MAP)).toHaveLength(32);
  });
});
