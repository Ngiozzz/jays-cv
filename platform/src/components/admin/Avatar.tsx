// A team member's round picture: their Google photo when they have one, otherwise their initials
export function Avatar({
  initials,
  image,
  className,
}: {
  initials: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <span className={className ? `avatar ${className}` : "avatar"}>
      {/* Google photos refuse requests that name the page they're shown on */}
      {image ? <img src={image} alt="" referrerPolicy="no-referrer" /> : initials}
    </span>
  );
}
