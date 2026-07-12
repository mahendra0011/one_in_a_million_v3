export default function Logo({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-lg',
    md: 'h-10 w-10 text-xl',
    lg: 'h-14 w-14 text-3xl',
  };

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center rounded-xl bg-gradient-to-br from-[#F07D14] to-[#E86C1B] text-white shadow-lg`}>
      🍔
    </div>
  );
}