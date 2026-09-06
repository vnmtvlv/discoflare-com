import { sendStream, setResponseHeaders } from 'h3'
import type { DeployProgressEvent } from '../../../shared/installer'
import { deploymentErrorMessage, runInstallerDeployment } from '../../utils/installer-deployment'
import { requireCloudflareToken } from '../../utils/installer-session'
import { assertInstallerMutation } from '../../utils/installer-security'

export default defineEventHandler(async (event) => {
  assertInstallerMutation(event)
  const body = await readBody(event)
  const accessToken = await requireCloudflareToken(event)
  const encoder = new TextEncoder()

  setResponseHeaders(event, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
  })

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true
      const write = (message: DeployProgressEvent) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`))
        }
        catch {
          open = false
        }
      }

      void runInstallerDeployment(event, body, write, accessToken)
        .then(result => write({ type: 'complete', result }))
        .catch(cause => write({ type: 'error', message: deploymentErrorMessage(cause) }))
        .finally(() => {
          if (!open) return
          open = false
          try {
            controller.close()
          }
          catch {
            // The browser can close the progress stream while provisioning continues.
          }
        })
    },
  })

  return sendStream(event, stream)
})
