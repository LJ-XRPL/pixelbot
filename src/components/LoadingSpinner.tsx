export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-muted"></div>
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent absolute top-0 left-0 animate-spin"></div>
      </div>
      <span className="ml-4 text-muted-foreground">Loading amazing AI creations...</span>
    </div>
  );
}