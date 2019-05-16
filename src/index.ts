#!/usr/bin/env node

import { App } from './App';
import { TaskDB } from './service/taskdb';

new App(new TaskDB()).main();
