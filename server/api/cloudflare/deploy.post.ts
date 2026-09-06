import type { DeployResponse } from '../../../shared/installer'
import { runInstallerDeployment } from '../../utils/installer-deployment'
import { assertInstallerMutation } from '../../utils/installer-security'

export default defineEventHandler(async (event): Promise<DeployResponse> => {
  assertInstallerMutation(event)
  return runInstallerDeployment(event, await readBody(event))
})
