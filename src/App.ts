import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table';
import moment from 'moment';
import { TaskDB } from './service/taskdb';
import { Task } from './interfaces/Task';
import { LisTask } from './interfaces/LisTask';
const clear = require('clear');

export class App {
	private tasks: Task[] = [];
	private lists: LisTask[] = [];

	constructor(private taskDb: TaskDB) {}

	async main() {
		do {
			let menRes = await this.willDo(); //menres contains the response of the main view
			switch (menRes.do) {
				case 'all':
					console.log(await this.seeList());
					break;
				case 'newL':
					let newlist = await this.inputLisTask();
					console.log(newlist);
					break;
				case 'new':
					let newtask = await this.inputTask();
					console.log(newtask);
					break;
				case 'del':
					let numDeleted = await this.deleteTask();
					console.log(numDeleted);
				default:
					break;
			}
		} while (true);
	}

	private async willDo(): Promise<{ do: string }> {
		return await inquirer.prompt([
			{
				type: 'list',
				name: 'do',
				message: '¿WHAT DO YOU WANT TO DO?',
				choices: [
					{
						name: 'Create a new tasks list',
						value: 'newL',
						short: chalk.magenta.bold('CREATE A NEW TASKS LIST')
					},
					{
						name: 'See all tasks',
						value: 'all',
						short: chalk.magenta.bold('SEE ALL TASKS')
					},
					{
						name: 'Create new task',
						value: 'new',
						short: chalk.magenta.bold('CREATE A NEW TASK')
					},
					{
						name: 'Delete tasks',
						value: 'del',
						short: chalk.magenta.bold('DELETE TASKS')
					}
				]
			}
		]);
	}

	private async inputLisTask(): Promise<LisTask> {
		let res: { name: string };
		res = await inquirer.prompt([
			{
				type: 'input',
				name: 'name',
				message: 'Name list',
				validate: (input: string) => {
					if (input.trim().length == 0) {
						return chalk.red.bold('Empty name list');
					} else {
						return true;
					}
				},
				filter: (input: string) => {
					return input.trim();
				}
			}
		]);
		return await this.taskDb.addList({
			name: res.name,
			created: new Date(),
			total: 0
		});
	}

	private async inputTask(): Promise<Task> {
		let res: { desc: string; list: string };
		let resMore: { desc: string; more: boolean };
		let taskCreated: Task;
		let newlista: LisTask;
		this.lists = await this.taskDb.getAllLists();
		if (this.lists.length == 0) {
			console.log(chalk.bold.yellow('You have to create a list for you can to create a task'));
			newlista = await this.inputLisTask();
			console.log(chalk.bold.yellow('Yeah, now yes'));
			this.lists.push(newlista);
		}
		res = await inquirer.prompt([
			{
				type: 'list',
				name: 'list',
				message: '¿A qué lista quieres agregar la tarea?',
				choices: this.lists.map((lista) => {
					return {
						name: `(${lista.total} TASKS): ${lista.name}`,
						value: lista._id
					};
				}),
				pageSize: this.lists.length
			},
			{
				type: 'input',
				name: 'desc',
				message: 'Task description',
				validate: (input: string) => {
					if (input.trim().length == 0) {
						return chalk.red.bold('Empty task');
					} else {
						return true;
					}
				},
				filter: (input: string) => {
					return input.trim();
				}
			}
		]);
		taskCreated = await this.taskDb.addTask({
			desc: res.desc,
			done: false,
			listaId: res.list,
			created: new Date()
		});
		do {
			resMore = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'more',
					message: '¿Do you create other task in this list?'
				},
				{
					type: 'input',
					name: 'desc',
					message: 'Task description',
					validate: (input: string) => {
						if (input.trim().length == 0) {
							return chalk.red.bold('Empty task');
						} else {
							return true;
						}
					},
					filter: (input: string) => {
						return input.trim();
					},
					when: (answers) => {
						if (answers.more == true) {
							return true;
						} else {
							return false;
						}
					}
				}
			]);
			if (resMore.more == true) {
				taskCreated = await this.taskDb.addTask({
					desc: resMore.desc,
					done: false,
					listaId: res.list,
					created: new Date()
				});
			}
		} while (resMore.more == true);
		return taskCreated;
	}

	private async deleteTask(): Promise<number> {
		this.lists = await this.taskDb.getAllLists();
		let taskOfList: Task[];
		let reslista: { list: string };
		let resTaskDelete: { idtasks: string[] };
		reslista = await inquirer.prompt({
			type: 'list',
			name: 'list',
			message: 'Choose the list',
			choices: this.lists.map((list) => {
				return {
					name: list.name,
					value: list._id
				};
			}),
			pageSize: this.lists.length
		});
		taskOfList = await this.taskDb.getTasksOfList(reslista.list);
		resTaskDelete = await inquirer.prompt({
			type: 'checkbox',
			name: 'idtasks',
			message: 'Choose the tasks for to delete',
			choices: taskOfList.map((task) => {
				return {
					name: `${task.done == true ? chalk.green.bold('DONE') : chalk.red.bold('NOT DONE')}: ${task.desc}`,
					value: task._id
				};
			}),
			pageSize: taskOfList.length
		});
		return await this.taskDb.deleteTasks(resTaskDelete.idtasks, reslista.list);
	}

	private async seeList(): Promise<string> {
		this.lists = await this.taskDb.getAllLists();
		let taskOfList: Task[];
		let reslista: { list: string };
		reslista = await inquirer.prompt({
			type: 'list',
			name: 'list',
			message: 'Choose the list',
			choices: this.lists.map((list) => {
				return {
					name: list.name,
					value: list._id
				};
			}),
			pageSize: this.lists.length
		});
		taskOfList = await this.taskDb.getTasksOfList(reslista.list);
		if (taskOfList.length == 0) {
			return 'No hay tareas para mostrar';
		} else {
			const table = new Table({
				colAligns: ['middle', 'left', 'left'],
				head: [chalk.bold.yellow('Done'), chalk.bold.yellow('Description'), chalk.bold.yellow('Created')]
			});

			table.push(
				...taskOfList.map((task) => [
					`${task.done == true ? chalk.bold.green('✓') : chalk.bold.red('✕')}`,
					task.desc,
					`${moment(task.created).format('dddd, MMMM D YYYY, h:mm a')}`
				])
			);

			return table.toString();
		}
	}
}
