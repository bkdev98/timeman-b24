import bodyParser from 'body-parser';
import cors from 'cors';

export default app => {
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors());
}