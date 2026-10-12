// Pure team rules for the Team screen

type Person = { id: string; role: "OWNER" | "WRITER" };

// The owner can't be paused or removed (there would be nobody left holding the reins),
// and nobody changes their own access from this screen
export function canChangeMember(actor: Person, target: Person): boolean {
  return target.role !== "OWNER" && target.id !== actor.id;
}

// The WhatsApp message that carries an invite. Sign-in is with Google, so it names the exact
// email address the invite was made for.
export function inviteMessage(
  invite: { name: string; email: string; canWrite: boolean; role?: "OWNER" | "WRITER" },
  signInUrl: string,
  business: string,
) {
  const firstName = invite.name.split(" ")[0];
  const greeting =
    invite.role === "OWNER"
      ? `Hi ${firstName}, your ${business} admin is ready: you're the owner 👋`
      : `Hi ${firstName}, I've added you to the ${business} team${invite.canWrite ? " as a writer" : ""} 👋`;
  return [
    greeting,
    "",
    `To join, open ${signInUrl} and choose "Continue with Google" using ${invite.email}.`,
    "The invite works for 14 days and only with that Google account.",
  ].join("\n");
}

export function whatsappTo(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "254");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function initialsOf(name: string): string {
  return (
    name
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
