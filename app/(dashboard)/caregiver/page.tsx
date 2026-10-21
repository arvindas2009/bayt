import { redirect } from 'next/navigation';

// The Caregiver page became the Load page; old links keep working.
export default function CaregiverRedirect() {
  redirect('/load');
}
