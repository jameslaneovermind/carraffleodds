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
          position: 'relative',
        }}
      >
        {/* Back die — rotated */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 6,
            width: 22,
            height: 22,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #fbbf24, #ea580c)',
            transform: 'rotate(12deg)',
            display: 'flex',
            flexWrap: 'wrap',
            padding: 3,
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 5 dots in a grid */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 3.5,
                height: 3.5,
                borderRadius: '50%',
                background: '#1e3a5f',
                position: 'absolute',
                top: i === 0 ? 4 : i === 1 ? 4 : i === 2 ? 9 : i === 3 ? 14 : 14,
                left: i === 0 ? 5 : i === 1 ? 13 : i === 2 ? 9 : i === 3 ? 5 : 13,
              }}
            />
          ))}
        </div>

        {/* Front die */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 22,
            height: 22,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            display: 'flex',
          }}
        >
          {/* 5 dots */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#1e3a5f',
                position: 'absolute',
                top: i === 0 ? 4 : i === 1 ? 4 : i === 2 ? 9 : i === 3 ? 14 : 14,
                left: i === 0 ? 4 : i === 1 ? 14 : i === 2 ? 9 : i === 3 ? 4 : 14,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
