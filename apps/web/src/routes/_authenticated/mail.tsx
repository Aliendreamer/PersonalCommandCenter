import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  List,
  Loader,
  Modal,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { Inbox, Mail, Send } from 'lucide-react'
import type { MailHeader, MailMessage } from '@pcc/contracts'

import {
  draftMailReply,
  getMailMessage,
  getMailMessages,
  sendMail,
  summariseMail,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/mail')({
  loader: async () =>
    settle(
      getMailMessages({ data: { folder: 'INBOX', limit: 20, offset: 0 } }),
    ),
  component: MailPage,
})

const FOLDERS = ['INBOX', 'Sent', 'Drafts']

interface ComposeForm {
  to: string
  subject: string
  body: string
}

function MailPage() {
  const result = Route.useLoaderData()

  const [activeFolder, setActiveFolder] = useState('INBOX')
  const [messages, setMessages] = useState<MailHeader[]>(result.data ?? [])
  const [folderLoading, setFolderLoading] = useState(false)
  const [selectedUid, setSelectedUid] = useState<number | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(
    null,
  )
  const [messageLoading, setMessageLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [composeOpen, { open: openCompose, close: closeCompose }] =
    useDisclosure(false)

  const form = useForm<ComposeForm>({
    initialValues: { to: '', subject: '', body: '' },
    validate: {
      to: (v) => (v.trim().length === 0 ? 'To is required' : null),
      subject: (v) => (v.trim().length === 0 ? 'Subject is required' : null),
      body: (v) => (v.trim().length === 0 ? 'Body is required' : null),
    },
  })

  const handleFolderChange = async (folder: string) => {
    setActiveFolder(folder)
    setSelectedUid(null)
    setSelectedMessage(null)
    setSummary(null)
    setFolderLoading(true)
    try {
      const msgs = await getMailMessages({
        data: { folder, limit: 20, offset: 0 },
      })
      setMessages(msgs)
    } catch {
      setMessages([])
    } finally {
      setFolderLoading(false)
    }
  }

  const handleSelectMessage = async (uid: number) => {
    setSelectedUid(uid)
    setSummary(null)
    setMessageLoading(true)
    try {
      const msg = await getMailMessage({ data: { uid, folder: activeFolder } })
      setSelectedMessage(msg)
    } catch {
      setSelectedMessage(null)
    } finally {
      setMessageLoading(false)
    }
  }

  const handleSummarise = async () => {
    if (!selectedUid) return
    setSummaryLoading(true)
    try {
      const res = await summariseMail({
        data: { uid: selectedUid, folder: activeFolder },
      })
      setSummary(res.summary)
    } catch {
      setSummary('Summarisation unavailable')
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleDraftReply = async () => {
    if (!selectedUid) return
    setDraftLoading(true)
    try {
      const res = await draftMailReply({
        data: { uid: selectedUid, folder: activeFolder },
      })
      form.setValues({
        to: selectedMessage?.from ?? '',
        subject: selectedMessage ? `Re: ${selectedMessage.subject}` : '',
        body: res.draft,
      })
      openCompose()
    } catch {
      // Fall back to empty compose
      form.setValues({
        to: selectedMessage?.from ?? '',
        subject: selectedMessage ? `Re: ${selectedMessage.subject}` : '',
        body: '',
      })
      openCompose()
    } finally {
      setDraftLoading(false)
    }
  }

  const handleSend = async (values: ComposeForm) => {
    setSending(true)
    try {
      await sendMail({
        data: {
          to: values.to
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          subject: values.subject,
          body: values.body,
          folder: activeFolder,
        },
      })
      closeCompose()
      form.reset()
    } catch {
      // Keep modal open so user can retry
    } finally {
      setSending(false)
    }
  }

  if (result.error && !messages.length) {
    return (
      <PluginPage title="Mail">
        <Text role="status" size="sm" c="yellow.7">
          Mail not configured
        </Text>
      </PluginPage>
    )
  }

  return (
    <PluginPage
      title="Mail"
      fill
      actions={
        <Button
          size="sm"
          leftSection={<Mail size={14} />}
          onClick={() => {
            form.reset()
            openCompose()
          }}
        >
          Compose
        </Button>
      }
    >
      <Group
        align="flex-start"
        gap={0}
        style={{ height: '100%' }}
        wrap="nowrap"
      >
        {/* Folder sidebar */}
        <Box
          w={180}
          style={{
            borderRight: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Stack gap={0}>
            {FOLDERS.map((folder) => (
              <NavLink
                key={folder}
                label={folder}
                leftSection={
                  folder === 'INBOX' ? (
                    <Inbox size={14} />
                  ) : folder === 'Sent' ? (
                    <Send size={14} />
                  ) : (
                    <Mail size={14} />
                  )
                }
                active={activeFolder === folder}
                onClick={() => handleFolderChange(folder)}
              />
            ))}
          </Stack>
        </Box>

        {/* Message list */}
        <ScrollArea
          w={320}
          style={{
            borderRight: '1px solid var(--mantine-color-default-border)',
            height: '100%',
          }}
        >
          {folderLoading ? (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          ) : messages.length === 0 ? (
            <Text size="sm" c="dimmed" p="md">
              No messages
            </Text>
          ) : (
            <Stack gap={0}>
              {messages.map((msg) => (
                <Paper
                  key={msg.uid}
                  p="sm"
                  radius={0}
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedUid === msg.uid
                        ? 'var(--mantine-color-default-hover)'
                        : undefined,
                    borderBottom:
                      '1px solid var(--mantine-color-default-border)',
                  }}
                  onClick={() => handleSelectMessage(msg.uid)}
                >
                  <Text size="sm" fw={msg.isRead ? 400 : 700} truncate>
                    {msg.subject}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {msg.from}
                  </Text>
                  <Group gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">
                      {new Date(msg.date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    {msg.tag && (
                      <Badge size="xs" variant="light">
                        {msg.tag}
                      </Badge>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </ScrollArea>

        {/* Reading pane */}
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflow: 'auto',
            padding: 'var(--mantine-spacing-md)',
          }}
        >
          {messageLoading ? (
            <Group justify="center">
              <Loader size="sm" />
            </Group>
          ) : !selectedMessage ? (
            <Text size="sm" c="dimmed">
              Select a message to read
            </Text>
          ) : (
            <Stack gap="sm">
              <Text fw={700} size="lg">
                {selectedMessage.subject}
              </Text>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  From:
                </Text>
                <Text size="sm">{selectedMessage.from}</Text>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  To:
                </Text>
                <Text size="sm">{selectedMessage.to}</Text>
              </Group>
              <Text size="xs" c="dimmed">
                {new Date(selectedMessage.date).toLocaleString()}
              </Text>

              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  loading={summaryLoading}
                  onClick={handleSummarise}
                >
                  Summarise
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  loading={draftLoading}
                  onClick={handleDraftReply}
                >
                  Draft Reply
                </Button>
              </Group>

              {summary && (
                <Alert title="Summary" color="blue" variant="light">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {summary}
                  </Text>
                </Alert>
              )}

              <Divider />
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedMessage.body}
              </Text>

              {selectedMessage.attachments.length > 0 && (
                <>
                  <Divider label="Attachments" labelPosition="left" />
                  <List size="sm">
                    {selectedMessage.attachments.map((att) => (
                      <List.Item key={att.name}>
                        {att.name} ({Math.round(att.size / 1024)} KB)
                      </List.Item>
                    ))}
                  </List>
                </>
              )}
            </Stack>
          )}
        </Box>
      </Group>

      {/* Compose modal */}
      <Modal
        opened={composeOpen}
        onClose={() => {
          closeCompose()
          form.reset()
        }}
        title="Compose"
        size="lg"
        centered
      >
        <form onSubmit={form.onSubmit(handleSend)}>
          <Stack gap="sm">
            <TextInput
              label="To *"
              placeholder="recipient@example.com, another@example.com"
              {...form.getInputProps('to')}
            />
            <TextInput label="Subject *" {...form.getInputProps('subject')} />
            <Textarea
              label="Body *"
              autosize
              minRows={6}
              {...form.getInputProps('body')}
            />
            <Group justify="flex-end" mt="xs">
              <Button
                variant="subtle"
                onClick={() => {
                  closeCompose()
                  form.reset()
                }}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={sending}
                leftSection={<Send size={14} />}
              >
                Send
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </PluginPage>
  )
}
