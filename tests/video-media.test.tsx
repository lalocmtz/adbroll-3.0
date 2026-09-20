import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VideoCard from "@/components/VideoCardOriginal";
vi.mock("framer-motion",async()=>{
  const {forwardRef}=await import("react");
  return {motion:{div:forwardRef<HTMLDivElement,React.HTMLAttributes<HTMLDivElement>>(({children,className,onMouseEnter,onMouseLeave},ref)=><div ref={ref} className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</div>)}};
});
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:{getUser:async()=>({data:{user:null}})}}}));
vi.mock("@/contexts/BlurGateContext",()=>({useBlurGateContext:()=>({hasPaid:true,isFounder:false})}));
vi.mock("@/components/VideoAnalysisModalOriginal",()=>({default:()=>null}));
vi.mock("@/components/ProductAssignmentModal",()=>({default:()=>null}));
beforeEach(()=>vi.stubGlobal("IntersectionObserver",class {observe(){} disconnect(){} unobserve(){}}));
afterEach(()=>vi.unstubAllGlobals());
const video={id:"video-1",video_url:"https://www.tiktok.com/@creator/video/123",video_mp4_url:"https://example.com/video.mp4"};
describe("playable video cards",()=>{
  it("hides rows without a stored media file",()=>{
    const {container}=render(<MemoryRouter><VideoCard video={{...video,video_mp4_url:null}} ranking={1}/></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
  it("hides failed media and recovers when a replacement URL is provided",async()=>{
    const {container,rerender}=render(<MemoryRouter><VideoCard video={video} ranking={1}/></MemoryRouter>);
    fireEvent.error(container.querySelector("video")!);
    expect(container).toBeEmptyDOMElement();
    rerender(<MemoryRouter><VideoCard video={{...video,video_mp4_url:"https://example.com/replacement.mp4"}} ranking={1}/></MemoryRouter>);
    await waitFor(()=>expect(container.querySelector("video")).toHaveAttribute("src","https://example.com/replacement.mp4"));
  });
});
