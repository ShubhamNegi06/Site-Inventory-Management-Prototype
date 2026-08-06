"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ExternalLink, UserPlus } from "lucide-react";
import { useSites } from "@/lib/useSites";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Site } from "@/lib/types";

export default function SitesPage() {
  const { sites, loading, reload } = useSites();
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [userModalSite, setUserModalSite] = useState<Site | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Sites</h1>
          <p className="mt-1 text-sm text-ink-400">Hospitals and pathology labs contributing to the inventory.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateSite(true)}>
          <Plus size={15} /> Add site
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : sites.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm font-medium text-ink">No sites yet</p>
          <p className="text-xs text-ink-400">Add your first hospital or pathology lab to get started.</p>
        </div>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id}>
                  <td className="font-medium text-ink">{site.name}</td>
                  <td className="font-mono text-ink-400">{site.slug}</td>
                  <td>
                    <span className={`chip ${site.is_active ? "border-l-success text-success" : "border-l-danger text-danger"}`}>
                      {site.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-ink-400">{formatDate(site.created_at)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost" onClick={() => setUserModalSite(site)}>
                        <UserPlus size={14} /> Add user
                      </button>
                      <Link href={`/admin/inventory?site_id=${site.id}`} className="btn-ghost">
                        <ExternalLink size={14} /> View inventory
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateSite && (
        <CreateSiteModal onClose={() => setShowCreateSite(false)} onCreated={reload} />
      )}
      {userModalSite && (
        <CreateSiteUserModal site={userModalSite} onClose={() => setUserModalSite(null)} />
      )}
    </div>
  );
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CreateSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/sites", { name, slug: slug || slugify(name) });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add site" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Site name</label>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. Unity Cancer Hospital"
          />
        </div>
        <div>
          <label className="label">Slug</label>
          <input
            className="input font-mono"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="unity-cancer-hospital"
          />
          <p className="mt-1 text-xs text-ink-400">Used in file storage paths. Lowercase, no spaces.</p>
        </div>
        {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner className="border-white/30 border-t-white" /> : "Add site"}</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateSiteUserModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/users/site-user", { email, password, full_name: fullName || null, site_id: site.id });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Modal title="User created" onClose={onClose}>
        <p className="text-sm text-ink-600">
          <span className="font-medium">{email}</span> can now sign in and enter data for{" "}
          <span className="font-medium">{site.name}</span>. Share the password with them through a secure channel.
        </p>
        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Add user — ${site.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Temporary password</label>
          <input
            type="text"
            required
            minLength={8}
            className="input font-mono"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner className="border-white/30 border-t-white" /> : "Create user"}</button>
        </div>
      </form>
    </Modal>
  );
}
