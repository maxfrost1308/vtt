'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { listFrameworks } from '@/lib/frameworks/index';
import { loadForgeFile } from '@/lib/forge/loader';
import type { ForgeProject } from 'forge';
import type { ForgeGameConfig } from '@/lib/forge/types';

interface HomeClientProps {
  user: { id: string; email: string | null; isAdmin: boolean } | null;
}

interface ServerForgeFile {
  name: string;
  size: number;
  config: ForgeGameConfig | null;
}

interface LoadedFile {
  project: ForgeProject;
  gameConfig: ForgeGameConfig;
  fileName: string;
}

export function HomeClient({ user }: HomeClientProps) {
  const supabase = createClient();
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? '';
  const frameworks = listFrameworks();

  const [serverFiles, setServerFiles] = useState<ServerForgeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [roleMappings, setRoleMappings] = useState<Record<string, string>>({});
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedServerFile = serverFiles.find((f) => f.name === selectedFile);
  const activeFramework = frameworks.find((fw) => fw.id === selectedFramework);

  useEffect(() => {
    if (!user) return;
    fetch(`${basePath}/api/forge-files`)
      .then((r) => r.json())
      .then((files: ServerForgeFile[]) => {
        setServerFiles(files);
        if (files.length > 0) setSelectedFile(files[0].name);
      })
      .catch(() => setServerFiles([]));
  }, [user, basePath]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}${basePath}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleFileChange = (name: string) => {
    setSelectedFile(name);
    setLoadedFile(null);
    setSelectedFramework('');
    setRoleMappings({});
    setLoadError(null);
    setSaveStatus('idle');
    setSaveError(null);
  };

  const handleLoadFile = useCallback(async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setLoadError(null);
    setSaveStatus('idle');
    setSaveError(null);

    try {
      const response = await fetch(`${basePath}/api/forge-files/${encodeURIComponent(selectedFile)}`);
      if (!response.ok) throw new Error('Failed to fetch forge file');
      const buffer = await response.arrayBuffer();
      const { project, gameConfig } = await loadForgeFile(buffer);
      setLoadedFile({ project, gameConfig, fileName: selectedFile });

      const serverConfig = serverFiles.find((f) => f.name === selectedFile)?.config;
      if (serverConfig) {
        setSelectedFramework(serverConfig.framework);
        setRoleMappings({ ...serverConfig.roles });
        const cfgVals: Record<string, string> = {};
        if (serverConfig.config) {
          for (const [k, v] of Object.entries(serverConfig.config)) {
            cfgVals[k] = String(v);
          }
        }
        setConfigValues(cfgVals);
      } else {
        setSelectedFramework('');
        setRoleMappings({});
        setConfigValues({});
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load forge file');
      setLoadedFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, basePath, serverFiles]);

  const handleFrameworkChange = (frameworkId: string) => {
    setSelectedFramework(frameworkId);
    setRoleMappings({});
    setSaveStatus('idle');
    setSaveError(null);
    const fw = frameworks.find((f) => f.id === frameworkId);
    const defaults: Record<string, string> = {};
    for (const field of fw?.configFields ?? []) {
      defaults[field.name] = field.defaultValue;
    }
    setConfigValues(defaults);
  };

  const handleRoleChange = (slotName: string, cardTypeId: string) => {
    setRoleMappings((prev) => ({ ...prev, [slotName]: cardTypeId }));
    setSaveStatus('idle');
  };

  const handleSaveConfig = async () => {
    if (!selectedFile || !selectedFramework) return;
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveError(null);

    const hasConfigValues = Object.keys(configValues).length > 0;
    const config: ForgeGameConfig = {
      framework: selectedFramework,
      roles: { ...roleMappings },
      ...(hasConfigValues ? { config: { ...configValues } } : {}),
    };

    try {
      const response = await fetch(
        `${basePath}/api/forge-files/${encodeURIComponent(selectedFile)}/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to save config');
      }
      setSaveStatus('success');

      setServerFiles((prev) =>
        prev.map((f) => (f.name === selectedFile ? { ...f, config } : f))
      );
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedFile || !selectedServerFile?.config || !user) return;
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch(`${basePath}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forge_file: selectedFile,
          game_config: selectedServerFile.config,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to create room');
      }

      const { code } = (await response.json()) as { code: string };
      window.location.href = `${basePath}/room/${code}`;
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    
    if (!joinCode.trim()) {
      setJoinError('Please enter a room code');
      return;
    }
    
    window.location.href = `${basePath}/room/${joinCode.trim().toLowerCase()}`;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-3">VTT</h1>
          <p className="text-zinc-400 text-lg">
            Play storygames and TTRPGs online with your friends.
          </p>
        </div>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full text-lg transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="white">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          Sign in with Discord
        </button>
      </div>
    );
  }

  const allRequiredSlotsMapped = activeFramework
    ? activeFramework.slots
        .filter((s) => s.required)
        .every((s) => roleMappings[s.name])
    : false;

  const canSave = selectedFramework && loadedFile && allRequiredSlotsMapped;

  return (
    <div className="flex flex-col items-center gap-10 p-8 min-h-screen">
      <header className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">VTT</h1>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-8">
        {user.isAdmin && (
          <section className="flex flex-col gap-5 p-6 bg-zinc-800 rounded-2xl border border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-100">Game Configuration</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Game Library
              </label>
              {serverFiles.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No .forge files found. Place them in the forge-files directory on the server.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {serverFiles.map((file) => (
                      <button
                        key={file.name}
                        onClick={() => handleFileChange(file.name)}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          selectedFile === file.name
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                        }`}
                      >
                        <div className="font-semibold text-zinc-100 text-sm">
                          {file.name.replace(/\.forge$/, '')}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {file.config ? file.config.framework : 'Not configured'}
                        </div>
                        {file.config && (
                          <span className="mt-2 inline-block text-xs text-amber-400">
                            \u2713 Ready to play
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedFile && selectedServerFile && (
                    <div className="flex gap-3 mt-4">
                      {selectedServerFile.config && (
                        <button
                          onClick={handleCreateRoom}
                          disabled={isCreating}
                          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-full transition-colors"
                        >
                          {isCreating ? 'Creating\u2026' : '\u25b6 Play'}
                        </button>
                      )}
                      <button
                        onClick={handleLoadFile}
                        disabled={!selectedFile || isLoading}
                        className="px-5 py-2.5 bg-zinc-600 hover:bg-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-100 font-medium rounded-full transition-colors"
                      >
                        {isLoading
                          ? 'Loading\u2026'
                          : selectedServerFile.config
                            ? 'Reconfigure'
                            : 'Configure'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {loadError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {loadError}
              </p>
            )}

            {loadedFile && (
              <>
                <div className="flex flex-col gap-1.5 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                  <p className="text-sm text-zinc-100 font-medium">
                    {loadedFile.project.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {loadedFile.project.cardTypes.map((ct) => (
                      <span
                        key={ct.id}
                        className="px-2.5 py-0.5 bg-zinc-600 text-zinc-300 rounded-full text-xs"
                      >
                        {ct.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Framework
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFramework}
                      onChange={(e) => handleFrameworkChange(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-700 border border-zinc-600 rounded-full text-zinc-100 appearance-none pr-10 focus:outline-none focus:border-zinc-400 transition-colors"
                    >
                      <option value="">Select a framework</option>
                      {frameworks.map((fw) => (
                        <option key={fw.id} value={fw.id}>
                          {fw.name} — {fw.description}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.427 5.427a.75.75 0 011.06-.013L8 7.822l2.513-2.408a.75.75 0 111.037 1.084l-3 2.874a.75.75 0 01-1.037 0l-3-2.874a.75.75 0 01-.086-1.07z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {activeFramework && activeFramework.slots.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-zinc-400">Role mapping</p>
                    {activeFramework.slots.map((slot) => (
                      <div key={slot.name}>
                        <label className="flex items-center gap-1.5 text-sm text-zinc-300 mb-1">
                          {slot.label}
                          {slot.required && (
                            <span className="text-amber-500 text-xs">*</span>
                          )}
                        </label>
                        <div className="relative">
                          <select
                            value={roleMappings[slot.name] ?? ''}
                            onChange={(e) => handleRoleChange(slot.name, e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-700 border border-zinc-600 rounded-full text-zinc-100 appearance-none pr-10 focus:outline-none focus:border-zinc-400 transition-colors"
                          >
                            <option value="">Select card type</option>
                            {loadedFile.project.cardTypes.map((ct) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.name}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M4.427 5.427a.75.75 0 011.06-.013L8 7.822l2.513-2.408a.75.75 0 111.037 1.084l-3 2.874a.75.75 0 01-1.037 0l-3-2.874a.75.75 0 01-.086-1.07z" />
                            </svg>
                          </div>
                        </div>
                        {slot.description && (
                          <p className="text-xs text-zinc-500 mt-1 ml-1">{slot.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeFramework && activeFramework.configFields.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-zinc-400">Framework settings</p>
                    {activeFramework.configFields.map((field) => (
                      <div key={field.name}>
                        <label className="text-sm text-zinc-300 mb-1 block">{field.label}</label>
                        <input
                          type="text"
                          value={configValues[field.name] ?? field.defaultValue}
                          onChange={(e) => {
                            setConfigValues((prev) => ({ ...prev, [field.name]: e.target.value }));
                            setSaveStatus('idle');
                          }}
                          className="w-full px-4 py-2.5 bg-zinc-700 border border-zinc-600 rounded-full text-zinc-100 focus:outline-none focus:border-zinc-400 transition-colors"
                        />
                        {field.description && (
                          <p className="text-xs text-zinc-500 mt-1 ml-1">{field.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveConfig}
                    disabled={!canSave || isSaving}
                    className="px-5 py-2.5 bg-zinc-600 hover:bg-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-100 font-medium rounded-full transition-colors"
                  >
                    {isSaving ? 'Saving\u2026' : 'Save Config'}
                  </button>
                  {saveStatus === 'success' && (
                    <span className="text-sm text-emerald-400">Saved</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-sm text-red-400">{saveError ?? 'Failed to save'}</span>
                  )}
                </div>
              </>
            )}

            {createError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}


          </section>
        )}

        <section className="flex flex-col gap-4 p-6 bg-zinc-800 rounded-2xl border border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-100">Join a Room</h2>
          <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                placeholder="brave-panda-sunset"
                maxLength={30}
                className="flex-1 px-4 py-2.5 bg-zinc-700 border border-zinc-600 rounded-full text-zinc-100 placeholder-zinc-500 font-mono tracking-wide text-base focus:outline-none focus:border-zinc-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-full transition-colors"
              >
                Join
              </button>
            </div>
            {joinError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {joinError}
              </p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
