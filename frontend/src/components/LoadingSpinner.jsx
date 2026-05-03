export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
