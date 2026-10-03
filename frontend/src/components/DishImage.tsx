import { useState, useEffect } from 'react';

type DishImageProps = {
  src: string;
  alt: string;
};

export function DishImage({ src, alt }: DishImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return <div className="image-fallback">Image unavailable</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
