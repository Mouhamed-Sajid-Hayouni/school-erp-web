type ErrorStateProps = {
  message: string;
};

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-2xl bg-red-50 p-6 text-red-700 shadow-sm">
      {message}
    </div>
  );
}