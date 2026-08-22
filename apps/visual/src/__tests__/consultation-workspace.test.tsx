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

  it('hands non-Bazi candidates to their existing workspace', () => {
    const onSelect = renderWizard();
    fireEvent.change(screen.getByTestId('consultation-query'), { target: { value: '八宅卧室方位布局' } });
    fireEvent.click(screen.getByRole('button', { name: '生成本地方案' }));
    expect(screen.getByText('calc_bazhai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '打开八宅大游年' }));
    expect(onSelect).toHaveBeenCalledWith('bazhai');
  });

  it('keeps the tool-to-workspace transfer map exhaustive for all 32 tools', () => {
    expect(new Set(Object.keys(TOOL_WORKSPACE_MAP))).toEqual(new Set(LOCAL_TOOL_NAMES));
    expect(Object.keys(TOOL_WORKSPACE_MAP)).toHaveLength(32);
  });
});
