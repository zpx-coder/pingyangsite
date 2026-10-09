'use client';

// 产品图集（PRD §6.4）：主图大图 + 缩略图列表，点击缩略图切换大图（当前项金边高亮）。
import { useState } from 'react';
import { mediaUrl } from '@/lib/paths';

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const safe = index < images.length ? index : 0;

  return (
    <div className="gallery">
      <div className="main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(images[safe])} alt={alt} />
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((image, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${image}-${i}`}
              src={mediaUrl(image)}
              alt=""
              className={i === safe ? 'on' : ''}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
