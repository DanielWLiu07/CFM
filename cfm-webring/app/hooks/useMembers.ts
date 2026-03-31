import { useState, useEffect } from 'react';
import type { ClassMember } from '../components/class/types';
import staticMembers from '../../data/members.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Fetch members from the backend API, with static JSON fallback. */
export function useMembers() {
  const [members, setMembers] = useState<ClassMember[]>(staticMembers as ClassMember[]);

  useEffect(() => {
    if (!API_URL) return; // no backend configured — static data is already set

    let cancelled = false;
    fetch(`${API_URL}/api/members`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setMembers(data);
        }
      })
      .catch(() => {}); // keep static fallback

    return () => { cancelled = true; };
  }, []);

  return { members };
}
