import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createChunkRecovery, installChunkRecovery } from '@/lib/chunk-recovery';
import { AppRecovery, AppRecoveryBoundary } from '@/components/AppRecovery';

function setup(online = true) {
  const data = new Map<string, string>();
  const storage = {getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const options = {storage,online:()=>online,reload:vi.fn(),showFallback:vi.fn()};
  return {options, recover:createChunkRecovery(options),data};
}
describe('deployment chunk recovery',()=>{
  it('reloads only once across events and the next page boot without changing the URL',()=>{
    const {options,recover,data}=setup();
    const href=window.location.href;
    recover(); recover();
    expect(options.reload).toHaveBeenCalledTimes(1);
    expect(data.size).toBe(1);
    expect(options.showFallback).not.toHaveBeenCalled();
    createChunkRecovery(options)();
    expect(options.reload).toHaveBeenCalledTimes(1);
    expect(options.showFallback).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(href);
  });
  it('shows recovery immediately offline and when session storage is blocked',()=>{
    const offline=setup(false); offline.recover();
    expect(offline.options.reload).not.toHaveBeenCalled();
    expect(offline.options.showFallback).toHaveBeenCalledOnce();
    const blocked=setup(); blocked.options.storage.setItem=()=>{throw new Error('storage blocked');}; blocked.recover();
    expect(blocked.options.reload).not.toHaveBeenCalled();
    expect(blocked.options.showFallback).toHaveBeenCalledOnce();
  });
  it('handles the actual Vite event and removes its listener cleanly',()=>{
    const {recover,options}=setup(); const uninstall=installChunkRecovery(window,recover);
    const event=new Event('vite:preloadError',{cancelable:true}); window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); expect(options.reload).toHaveBeenCalledOnce();
    uninstall(); const later=new Event('vite:preloadError',{cancelable:true});window.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });
  it('provides accessible manual retry and keeps the current referral/redirect URL',()=>{
    const original=window.location.href;
    window.history.replaceState(null,'','/login?redirect=%2Faffiliates&ref=LALO#registro');
    const reload=vi.spyOn(window.location,'reload').mockImplementation(()=>{});
    const href=window.location.href;
    render(<AppRecovery />);
    expect(screen.getByRole('alert')).toHaveAccessibleName('No pudimos abrir esta página');
    fireEvent.click(screen.getByRole('button',{name:'Volver a intentar'}));
    expect(reload).toHaveBeenCalledOnce(); expect(window.location.href).toBe(href);
    reload.mockRestore();
    window.history.replaceState(null,'',original);
  });
  it('catches the React lazy rejection instead of leaving a blank screen',()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    function BrokenRoute(): never {throw new Error('Failed to fetch dynamically imported module: private-url');}
    render(<AppRecoveryBoundary><BrokenRoute /></AppRecoveryBoundary>);
    expect(screen.getByRole('button',{name:'Volver a intentar'})).toBeInTheDocument();
    expect(screen.queryByText(/private-url/)).not.toBeInTheDocument();
    log.mockRestore();
  });
});
