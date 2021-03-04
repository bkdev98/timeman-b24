import express from 'express'
import Agenda from 'agenda'
import Bitrix from '@2bad/bitrix'

import constants from './config/constants'
import configMiddleware from './config/middlewares'

const agenda = new Agenda({ db: { address: constants.MONGODB_URL } })
agenda.start()

const app = express()

configMiddleware(app)

async function getTimemanStatus(webhook) {
  const bitrix = Bitrix(webhook)

  const result = await bitrix.call('timeman.status')

  return result
}

async function clockIn(webhook) {
  const bitrix = Bitrix(webhook)

  const result = await bitrix.call('timeman.open')

  return result
}

async function clockOut(webhook) {
  const bitrix = Bitrix(webhook)

  const result = await bitrix.call('timeman.close')

  return result
}

async function scheduleTimeman(webhook) {
  const bitrix = Bitrix(webhook)

  const user = await bitrix.call('user.current')

  const clockInId = `clock-in ${webhook}`
  agenda.define(clockInId, async () => {
    console.log('start timeman ' + webhook)
    const result = await bitrix.call('timeman.open')
    console.log('finish clock-in ', result)
  });
  await agenda.every("30 8 * * 1-5", clockInId)

  const clockOutId = `clock-out ${webhook}`
  agenda.define(clockOutId, async () => {
    console.log('start timeman ' + webhook)
    const result = await bitrix.call('timeman.close')
    console.log('finish clock-out ', result)
  });
  await agenda.every("0 18 * * 1-5", clockOutId)

  return user
}

async function cancelTimeman(webhook) {
  const a = await agenda.cancel({ name: `clock-in ${webhook}` })
  const b = await agenda.cancel({ name: `clock-out ${webhook}` })
  return a + b;
}

function getTimeZone() {
  var offset = new Date().getTimezoneOffset(), o = Math.abs(offset);
  return (offset < 0 ? "+" : "-") + ("00" + Math.floor(o / 60)).slice(-2) + ":" + ("00" + (o % 60)).slice(-2);
}

app.get('/', (req, res) => {
  return res.status(200).json({
    title: 'Timeman 🕰',
    date: new Date(),
    timezone: getTimeZone(),
  })
})

app.post('/api/status', async (req, res) => {
  const {webhook} = req.body

  try {
    const status = await getTimemanStatus(webhook)

    return res.status(200).json(status)
  } catch (error) {
    return res.status(400).json(error)
  }
})

app.post('/api/schedule', async (req, res) => {
  const {webhook} = req.body

  try {
    const user = await scheduleTimeman(webhook)

    return res.status(200).json(user)
  } catch (error) {
    return res.status(400).json(error)
  }
})

app.post('/api/cancel', async (req, res) => {
  const {webhook} = req.body

  try {
    const count = await cancelTimeman(webhook)

    return res.status(200).json(count)
  } catch (error) {
    return res.status(400).json(error)
  }
})


app.post('/api/clock-in', async (req, res) => {
  const {webhook} = req.body

  try {
    const result = await clockIn(webhook)

    return res.status(200).json(result)
  } catch (error) {
    return res.status(400).json(error)
  }
})

app.post('/api/clock-out', async (req, res) => {
  const {webhook} = req.body

  try {
    const result = await clockOut(webhook)

    return res.status(200).json(result)
  } catch (error) {
    return res.status(400).json(error)
  }
})

app.listen(constants.PORT, () => console.log(`Timeman wake up on port ${constants.PORT} 🕰`))
