'use client'

import { useState } from 'react'
import { KeyRound, Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export interface KeyStatus {
    configured: boolean
    hint: string | null
    sharedKeyAvailable: boolean
}

/**
 * Where the user pastes their own DeepSeek key. The key is posted straight to
 * /api/chat/key, which encrypts it before it reaches the database — it is never
 * put in localStorage, and the server never sends it back, so this dialog can
 * show only the last four characters of a key already stored.
 */
export function ApiKeyDialog({
    open,
    onOpenChange,
    status,
    onStatusChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    status: KeyStatus
    onStatusChange: (status: KeyStatus) => void
}) {
    const [apiKey, setApiKey] = useState('')
    const [saving, setSaving] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function close(next: boolean) {
        if (!next) {
            setApiKey('')
            setError(null)
        }
        onOpenChange(next)
    }

    async function save() {
        setSaving(true)
        setError(null)
        try {
            const response = await fetch('/api/chat/key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            })
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Could not save the key.')
                return
            }

            onStatusChange({ ...status, configured: true, hint: data.hint })
            close(false)
        } catch {
            setError('Could not reach the server. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    async function remove() {
        setRemoving(true)
        setError(null)
        try {
            const response = await fetch('/api/chat/key', { method: 'DELETE' })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                setError(data.error || 'Could not remove the key.')
                return
            }
            onStatusChange({ ...status, configured: false, hint: null })
            close(false)
        } catch {
            setError('Could not reach the server. Please try again.')
        } finally {
            setRemoving(false)
        }
    }

    const busy = saving || removing

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="paper-surface sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-[var(--vermillion)]" />
                        DeepSeek API key
                    </DialogTitle>
                    <DialogDescription>
                        {status.configured ? (
                            <>
                                A key ending <span className="font-mono">…{status.hint}</span> is
                                stored. Paste a new one to replace it.
                            </>
                        ) : status.sharedKeyAvailable ? (
                            'Chat is using the shared key. Add your own to be billed to your own DeepSeek account.'
                        ) : (
                            'Chat needs a key before it can answer. Get one at platform.deepseek.com.'
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Input
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="sk-…"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && apiKey.trim() && !busy) save()
                        }}
                        disabled={busy}
                        className="font-mono"
                    />
                    <p className="text-xs text-[var(--ink-3)]">
                        Encrypted before it is stored, and never sent back to this page.
                    </p>
                    {error && (
                        <p className="text-sm text-[var(--vermillion-dk)]" role="alert">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    {status.configured ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={remove}
                            disabled={busy}
                            className="gap-2"
                        >
                            {removing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Remove
                        </Button>
                    ) : (
                        <span />
                    )}

                    <Button type="button" onClick={save} disabled={!apiKey.trim() || busy} className="gap-2">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save key
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
