// Material Symbols Outlined icon — matches the Stitch design's icon set.
interface Props {
  name: string;
  size?: number;
  className?: string;
}

export default function MaterialIcon({ name, size = 16, className = '' }: Props) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{ fontSize: size, width: size, height: size, lineHeight: 1 }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
