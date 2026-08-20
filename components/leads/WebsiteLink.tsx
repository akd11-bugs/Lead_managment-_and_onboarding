export function WebsiteLink({ website, className = 'text-blue-600 hover:underline' }: { website: string | null; className?: string }) {
  if (!website) return <>—</>
  return (
    <a
      href={website.startsWith('http') ? website : `https://${website}`}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {website}
    </a>
  )
}
