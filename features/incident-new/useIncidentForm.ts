import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { cachedRead } from '../../lib/cachedRead';
import { qk } from '../../lib/apiHooks';
import { incidentsApi, projectsApi } from '../../lib/services';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import type { IncidentType, Project } from '../../types/models';
import { INITIAL_FORM, computeHasSubstance, type FormData, type IncidentPhoto } from './incidentFormSchema';

/**
 * Owns the incident flow's multi-step form state: a stable per-field setter bag
 * (identities never change, so the memoized `IncidentField` inputs only
 * re-render for the one field being typed — the per-keystroke perf fix),
 * witness/photo handlers, project load, edit-mode hydration, and the derived
 * dirty/exit-draft flags the header + save hooks consume.
 */
export function useIncidentForm({
  paramProjectId,
  editId,
}: {
  paramProjectId?: string;
  editId?: string;
}) {
  const { pickPhotosWithAnnotation } = usePhotoPicker();

  const [pickedProject, setPickedProject] = useState<Project | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [witnessInput, setWitnessInput] = useState('');
  const projectId = paramProjectId ?? pickedProject?.id;

  // Stable client-side incident id — lets us upload photos before the row is
  // created. In edit mode it's the existing record's id so save updates it.
  const incidentId = useRef(editId ?? Crypto.randomUUID()).current;

  // Stable per-field setters (identity fixed for the component's lifetime).
  const setters = useMemo(() => ({
    type: (v: IncidentType) => setForm(f => ({ ...f, type: v })),
    injuredName: (v: string) => setForm(f => ({ ...f, injuredName: v })),
    injuredRole: (v: string) => setForm(f => ({ ...f, injuredRole: v })),
    dateTime: (v: Date) => setForm(f => ({ ...f, dateTime: v })),
    location: (v: string) => setForm(f => ({ ...f, location: v })),
    description: (v: string) => setForm(f => ({ ...f, description: v })),
    cause: (v: string) => setForm(f => ({ ...f, cause: v })),
    actionsTaken: (v: string) => setForm(f => ({ ...f, actionsTaken: v })),
  }), []);

  const addPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation({ skipAnnotate: true });
    if (results.length === 0) return;
    const newPhotos: IncidentPhoto[] = results.map(r => ({ uri: r.uri }));
    setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }));
  }, [pickPhotosWithAnnotation]);

  const removePhoto = useCallback((idx: number) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  }, []);

  const addWitness = useCallback(() => {
    const name = witnessInput.trim();
    if (!name) return;
    setForm(f => ({ ...f, witnesses: [...f.witnesses, name] }));
    setWitnessInput('');
  }, [witnessInput]);

  const removeWitness = useCallback((idx: number) => {
    setForm(f => ({ ...f, witnesses: f.witnesses.filter((_, i) => i !== idx) }));
  }, []);

  // load project once
  useEffect(() => {
    if (!projectId || project) return;
    let mounted = true;
    cachedRead(qk.projects.byId(projectId), () => projectsApi.getById(projectId))
      .then(p => { if (mounted) setProject(p); })
      .catch(() => null);
    return () => { mounted = false; };
  }, [projectId, project]);

  // Edit mode: hydrate the form from the (reopened) incident. Existing photos
  // carry their storage path so save keeps them without re-uploading.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editId || hydratedRef.current) return;
    hydratedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const inc = await cachedRead(qk.incidents.byId(editId), () => incidentsApi.getById(editId));
        if (!inc || !mounted) return;
        const photoEntries = await Promise.all(
          (inc.photos ?? []).map(async path => ({
            uri: await imageForDisplay(STORAGE_BUCKETS.incidentPhotos, path).catch(() => ''),
            existingPath: path,
          })),
        );
        if (!mounted) return;
        setForm({
          type: inc.type,
          injuredName: inc.injured_name ?? '',
          injuredRole: inc.injured_role ?? '',
          dateTime: inc.date_time ? new Date(inc.date_time) : new Date(),
          location: inc.location ?? '',
          description: inc.description ?? '',
          cause: inc.cause ?? '',
          actionsTaken: inc.actions_taken ?? '',
          witnesses: inc.witnesses ?? [],
          photos: photoEntries.filter(p => p.uri),
        });
      } catch {
        // best-effort: leave the blank form if hydration fails
      }
    })();
    return () => { mounted = false; };
  }, [editId]);

  // ── derived ───────────────────────────────────────────────────────────────
  const hasSubstance = useMemo(() => computeHasSubstance(form), [form]);
  const isFormDirty = form.type !== null || hasSubstance;
  // A NEW incident with real content is silently kept as a draft on exit (the
  // draft path already exists — same write as the step-4 "save" button), so
  // the exit dialog's "saved as draft" copy is true. Edit mode keeps explicit
  // saves only; there the dialog warns that the changes are discarded.
  const exitSavesDraft = !editId && !!projectId && form.type !== null && hasSubstance;

  return {
    form,
    incidentId,
    projectId,
    project,
    setProject,
    setPickedProject,
    setters,
    witnessInput,
    setWitnessInput,
    addWitness,
    removeWitness,
    addPhoto,
    removePhoto,
    hasSubstance,
    isFormDirty,
    exitSavesDraft,
  };
}
