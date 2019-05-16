import Datastore from 'nedb';
import moment from 'moment';
import { Task } from '../interfaces/Task';
import { LisTask } from '../interfaces/LisTask';

export class TaskDB {
	private list_tasks: Datastore;
	private tasks: Datastore;

	constructor() {
		this.list_tasks = new Datastore({ filename: './tasks/listasks.db', autoload: true });
		this.tasks = new Datastore({ filename: './tasks/tasks.db', autoload: true });
	}

	getAllLists(): Promise<LisTask[]> {
		return new Promise((resolve, reject) => {
			this.list_tasks.find({}, (error: Error, allLists: LisTask[]) => {
				if (error) {
					reject(error);
				} else {
					resolve(
						allLists.sort((a, b) => {
							return a.name > b.name ? 1 : -1;
						})
					);
				}
			});
		});
	}

	addList(lista: LisTask): Promise<LisTask> {
		return new Promise((resolve, reject) => {
			this.list_tasks.insert(lista, (error: Error, newList: LisTask) => {
				if (error) {
					reject(error);
				} else {
					resolve(newList);
				}
			});
		});
	}

	getTasksOfList(idLista: string): Promise<Task[]> {
		return new Promise((resolve, reject) => {
			this.tasks.find({ listaId: idLista }, (error: Error, allTasks: Task[]) => {
				if (error) {
					reject(error);
				} else {
					resolve(
						allTasks.sort((a, b) => {
							return moment(b.created).valueOf() - moment(a.created).valueOf();
						})
					);
				}
			});
		});
	}

	getAllTasks(): Promise<Task[]> {
		return new Promise((resolve, reject) => {
			this.tasks.find({}, (error: Error, allTasks: Task[]) => {
				if (error) {
					reject(error);
				} else {
					resolve(allTasks);
				}
			});
		});
	}

	addTask(task: Task): Promise<Task> {
		return new Promise((resolve, reject) => {
			this.tasks.insert(task, (error: Error, newTask: Task) => {
				if (error) {
					reject(error);
				} else {
					this.list_tasks.findOne({ _id: task.listaId }, (error: Error, lista: LisTask) => {
						if (error) {
							reject(error);
						} else {
							this.list_tasks.update(
								{ _id: task.listaId },
								{ $set: { total: lista.total + 1 } },
								{ multi: false },
								(error: Error, nUpdate: number, upsert: boolean) => {
									if (error) {
										reject(error);
									} else {
										resolve(newTask);
									}
								}
							);
						}
					});
				}
			});
		});
	}

	deleteTasks(idTasks: string[], idList: string): Promise<number> {
		let allIds = idTasks.map((taskId) => ({
			_id: taskId
		}));
		return new Promise((resolve, reject) => {
			this.tasks.remove(
				{
					$or: allIds
				},
				{ multi: true },
				(error: Error, numDeleted: number) => {
					if (error) {
						reject(error);
					} else {
						this.list_tasks.findOne({ _id: idList }, (error: Error, lista: LisTask) => {
							if (error) {
								reject(error);
							} else {
								this.list_tasks.update(
									{ _id: idList },
									{ $set: { total: lista.total - idTasks.length } },
									{ multi: false },
									(error: Error, nUpdate: number, upsert: boolean) => {
										if (error) {
											reject(error);
										} else {
											resolve(numDeleted);
										}
									}
								);
							}
						});
					}
				}
			);
		});
	}
}
