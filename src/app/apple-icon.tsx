import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          position: 'relative',
        }}
      >
        {/* Back die — rotated */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 58,
            width: 90,
            height: 90,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #fbbf24, #ea580c)',
            transform: 'rotate(12deg)',
            display: 'flex',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#1e3a5f',
                position: 'absolute',
                top: i === 0 ? 16 : i === 1 ? 16 : i === 2 ? 38 : i === 3 ? 60 : 60,
                left: i === 0 ? 18 : i === 1 ? 58 : i === 2 ? 38 : i === 3 ? 18 : 58,
              }}
            />
          ))}
        </div>

        {/* Front die */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 32,
            width: 90,
            height: 90,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            display: 'flex',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: i === 0 ? 14 : i === 1 ? 14 : i === 2 ? 37 : i === 3 ? 61 : 61,
                left: i === 0 ? 16 : i === 1 ? 59 : i === 2 ? 37 : i === 3 ? 16 : 59,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
