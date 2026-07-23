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
        <div
          style={{
            width: 135,
            height: 135,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #fbbf24, #ea580c)',
            position: 'relative',
            display: 'flex',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 21,
                height: 21,
                borderRadius: '50%',
                background: '#7c2d12',
                position: 'absolute',
                top: i === 0 ? 20 : i === 1 ? 20 : i === 2 ? 57 : i === 3 ? 94 : 94,
                left: i === 0 ? 20 : i === 1 ? 94 : i === 2 ? 57 : i === 3 ? 20 : 94,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
