import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #fbbf24, #ea580c)',
            position: 'relative',
            display: 'flex',
          }}
        >
          {/* 5 dots in a grid */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#7c2d12',
                position: 'absolute',
                top: i === 0 ? 4 : i === 1 ? 4 : i === 2 ? 9.5 : i === 3 ? 15 : 15,
                left: i === 0 ? 4 : i === 1 ? 15 : i === 2 ? 9.5 : i === 3 ? 4 : 15,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
