type LoadingStateProps = {
  message?: string;
};

export default function LoadingState({
  message = "Loading...",
}: LoadingStateProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-slate-600">{message}</p>
    </div>
  );
}