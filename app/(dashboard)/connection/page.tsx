import { redirect } from 'next/navigation';

// Connection folded into the Briefing ("Time together"); old links keep working.
export default function ConnectionRedirect() {
  redirect('/briefing');
}
