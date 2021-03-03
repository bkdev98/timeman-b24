import express from 'express'
import Agenda from 'agenda'
import Bitrix from '@2bad/bitrix'

import constants from './config/constants'
import configMiddleware from './config/middlewares'

const agenda = new Agenda({ db: { address: constants.MONGODB_URL } })
agenda.start()

const app = express()

configMiddleware(app)

async function scheduleTimeman(webhook) {
  const bitrix = Bitrix(webhook)

  const user = await bitrix.call('user.current')

  const clockInId = `clock-in ${webhook}`;

  agenda.define(clockInId, async () => {
    console.log('start timeman ' + webhook)
    try {
      const result = await bitrix.call('timeman.pause')

      console.log('finish clock-in ', result)
    } catch (error) {
      console.log('error ', error.message)
    }
  });

  await agenda.every("30 8 * * 1-5", clockInId)

  const clockOutId = `clock-out ${webhook}`;

  agenda.define(clockOutId, async () => {
    console.log('start timeman ' + webhook)
    try {
      const result = await bitrix.call('timeman.open')

      console.log('finish clock-out ', result)
    } catch (error) {
      console.log('error ', error.message)
    }
  });

  await agenda.every("0 18 * * 1-5", clockOutId)

  return user
}

async function cancelTimeman(webhook) {
  const a = await agenda.cancel({ name: `clock-in ${webhook}` });
  const b = await agenda.cancel({ name: `clock-out ${webhook}` });
  return a + b;
}

app.get('/', (req, res) => {
  return res.status(200).json("Timeman 🕰")
})

app.post('/api/schedule', async (req, res) => {
  const {webhook} = req.body

  const user = await scheduleTimeman(webhook)

  return res.status(200).json(user)
})

app.post('/api/cancel', async (req, res) => {
  const {webhook} = req.body

  const count = await cancelTimeman(webhook)

  return res.status(200).json(count)
})

app.listen(constants.PORT, () => console.log(`Timeman wake up on port ${constants.PORT} 🕰`))
