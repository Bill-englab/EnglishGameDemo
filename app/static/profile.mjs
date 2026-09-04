import { normalizeNickname } from './profile-model.mjs';

const DEFAULT_AVATAR = '/static/avatar-default.svg';

// Isolated from map/lesson state; a profile changes display identity only.
export function initProfile(initialProfile) {
  const dialog = document.getElementById('profile-dialog');
  const form = document.getElementById('profile-form');
  const fields = document.getElementById('profile-fields');
  const status = document.getElementById('profile-status');
  const nickname = document.getElementById('profile-nickname');
  const username = document.getElementById('profile-username');
  const photo = document.getElementById('profile-photo');
  const preview = document.getElementById('profile-preview');
  const save = document.getElementById('profile-save');
  const cancel = document.getElementById('profile-cancel');
  const trigger = document.getElementById('profile-open');
  const accountTrigger = document.getElementById('user-menu-trigger');
  const avatar = document.getElementById('user-avatar');
  let identity = initialProfile.username;
  let token = '';
  let draftFile = null;
  let resetAvatar = false;
  let objectURL = null;
  let generation = 0;
  let imageGeneration = 0;
  let requestController = null;
  let busy = false;
  let selecting = false;

  function showProfile(profile) {
    document.getElementById('user-name').textContent = profile.displayName || profile.username;
    avatar.src = profile.avatarUrl ? `${profile.avatarUrl}?v=${Date.now()}` : DEFAULT_AVATAR;
  }
  avatar.addEventListener('error', () => {
    if (!avatar.src.endsWith(DEFAULT_AVATAR)) avatar.src = DEFAULT_AVATAR;
  });
  showProfile(initialProfile);

  function releasePreview() {
    imageGeneration++;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    draftFile = null;
    photo.value = '';
  }

  function showError(message) {
    status.dataset.error = 'true';
    status.textContent = message;
  }

  function setBusy(value) {
    busy = value;
    fields.disabled = value;
    save.disabled = value || selecting || !token;
    cancel.disabled = value;
    form.setAttribute('aria-busy', String(value));
    save.textContent = value ? 'Saving…' : 'Save';
  }

  async function jsonRequest(options = {}) {
    requestController?.abort();
    requestController = new AbortController();
    const controller = requestController;
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/profile', {
        credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clear();
        window.location.assign('/login');
        throw new Error('Please sign in again.');
      }
      if (!response.ok) throw new Error(body.error || (response.status === 413
        ? 'Choose a photo smaller than 5 MB.' : 'Could not save. Please try again.'));
      if (body.username !== identity) {
        clear();
        window.location.reload();
        throw new Error('Your account changed. Reloading…');
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  function close() {
    if (busy) return;
    dialog.close();
  }

  dialog.addEventListener('close', () => {
    generation++;
    requestController?.abort();
    releasePreview();
    token = '';
    document.body.classList.remove('profile-open');
    accountTrigger.focus();
  });
  dialog.addEventListener('cancel', event => {
    if (busy) event.preventDefault();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  cancel.addEventListener('click', close);

  trigger.addEventListener('click', async () => {
    // The map entry cannot interrupt a live recording hidden in detail view.
    if (document.querySelector('.record-btn.recording, [data-recording-countdown="true"]')) return;
    document.getElementById('user-menu-popup').style.display = 'none';
    generation++;
    const current = generation;
    releasePreview();
    resetAvatar = false;
    selecting = false;
    token = '';
    nickname.value = '';
    username.textContent = identity;
    preview.src = DEFAULT_AVATAR;
    fields.disabled = true;
    save.disabled = true;
    cancel.disabled = false;
    status.dataset.error = 'false';
    status.textContent = 'Loading your profile…';
    document.body.classList.add('profile-open');
    dialog.showModal();
    try {
      const profile = await jsonRequest();
      if (current !== generation || !dialog.open) return;
      token = profile.csrfToken;
      nickname.value = profile.nickname;
      preview.src = profile.avatarUrl ? `${profile.avatarUrl}?v=${Date.now()}` : DEFAULT_AVATAR;
      setBusy(false);
      status.textContent = '';
      nickname.focus();
    } catch (error) {
      if (current === generation && dialog.open) showError('Could not load your profile. Close and try again.');
    }
  });

  document.getElementById('profile-choose').addEventListener('click', () => photo.click());
  document.getElementById('profile-default').addEventListener('click', () => {
    releasePreview();
    selecting = false;
    resetAvatar = true;
    preview.src = DEFAULT_AVATAR;
    status.textContent = 'Default avatar selected. Save to keep it.';
    status.dataset.error = 'false';
    save.disabled = !token;
  });

  photo.addEventListener('change', async () => {
    const selected = photo.files?.[0];
    if (!selected) return;
    const currentImage = ++imageGeneration;
    selecting = true;
    save.disabled = true;
    let candidateURL = null;
    try {
      if (selected.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
      candidateURL = URL.createObjectURL(selected);
      const candidate = new Image();
      candidate.src = candidateURL;
      await candidate.decode().catch(() => { throw new Error('Choose JPEG, PNG or static WebP. Export HEIC as JPEG first.'); });
      if (candidate.naturalWidth * candidate.naturalHeight > 16_000_000) {
        throw new Error('Choose a photo with 16 million pixels or fewer.');
      }
      if (currentImage !== imageGeneration || !dialog.open) return;
      if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = candidateURL;
      candidateURL = null;
      draftFile = selected;
      resetAvatar = false;
      preview.src = objectURL;
      status.dataset.error = 'false';
      status.textContent = 'Looking good! Save to keep your photo.';
    } catch (error) {
      if (currentImage === imageGeneration && dialog.open) showError(error.message);
    } finally {
      if (candidateURL) URL.revokeObjectURL(candidateURL);
      if (currentImage === imageGeneration) {
        selecting = false;
        save.disabled = !token || busy;
      }
      photo.value = '';
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || selecting || !token) return;
    const current = generation;
    try {
      const value = normalizeNickname(nickname.value);
      const body = new FormData();
      body.append('nickname', value);
      body.append('resetAvatar', String(resetAvatar));
      if (draftFile) body.append('avatar', draftFile, draftFile.name);
      setBusy(true);
      status.dataset.error = 'false';
      status.textContent = 'Saving your profile…';
      const updated = await jsonRequest({ method: 'POST', body, headers: {'X-CSRF-Token': token} });
      if (current !== generation || !dialog.open) return;
      showProfile(updated);
      setBusy(false);
      close();
    } catch (error) {
      if (current !== generation || !dialog.open) return;
      setBusy(false);
      showError(error.name === 'AbortError' ? 'The connection timed out. Reopen your profile to check, or retry.' : error.message);
    }
  });

  function clear() {
    generation++;
    identity = null;
    requestController?.abort();
    setBusy(false);
    if (dialog.open) dialog.close();
    releasePreview();
    document.getElementById('user-name').textContent = '';
    avatar.src = DEFAULT_AVATAR;
  }
  return { clear };
}
