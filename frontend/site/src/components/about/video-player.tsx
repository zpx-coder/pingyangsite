'use client';

// 介绍视频播放器（PRD §9.1 点击加载策略）：首屏仅渲染封面图，
// 点击播放按钮后才挂载 <video> 并请求视频文件，避免页面加载期产生视频流量。
import { useState } from 'react';
import { mediaUrl } from '@/lib/paths';

export default function VideoPlayer({
  src,
  cover,
  caption,
  ariaLabel,
}: {
  src: string;
  cover: string;
  caption: string;
  ariaLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="video-media">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video className="video-el" src={mediaUrl(src)} controls autoPlay />
      </div>
    );
  }

  return (
    <div className="video-media" role="button" tabIndex={0} aria-label={ariaLabel} onClick={() => setPlaying(true)} onKeyDown={(e) => e.key === 'Enter' && setPlaying(true)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="video-cover" src={mediaUrl(cover)} alt={caption} />
      <div className="video-shade" />
      <div className="video-play-wrap">
        <div className="video-play">
          <i />
        </div>
      </div>
      <div className="video-caption">{caption}</div>
    </div>
  );
}
