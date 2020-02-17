/**
 * @typedef {Promise<*>|Object} Prometzel
 * @property {function(*)} resolve
 * @property {function(*)} reject
 * @property {function(err, *?)} callback
 */
/**
 * Create a promise with a few extra props that make it a bit
 * easier to use with callback-based code
 * @example
 * const p = prometzel();
 * fs.readFile('/tmp/file.txt', 'utf8', p.callback);
 * return p;
 * @returns {Prometzel}
 */
function prometzel() {
	let resolve, reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	promise.resolve = resolve;
	promise.reject = reject;
	promise.callback = (err, res) => {
		if (err) {
			promise.reject(err);
		} else {
			promise.resolve(res);
		}
	};

	return promise;
}

/**
 * Generate promise for each element of the args array or hash, then execute them as a chain (one after another),
 * or with however many we want at one time (provided by the "parallelism" param).
 * Returns a promise that will be resolved once all args are handled.
 * All results are gathered in an array (like with Promise.all()) or in a hash with the same keys as the args hash.
 * @template T
 * @template V
 * @param {Array<V>|Object.<string, V>|number} args Array of arguments, or lookup of arguments, or the number of times to call the worker
 * @param {function(V, key):Promise<T>} worker Function that takes an arg and returns a promise. Falls back to a simple mapper.
 * @param parallelism How many promises to run at once. For array, defaults to 1. For hashes, to all keys at once.
 * @return Promise<Array<T>>
 */
function promiseChain(args, worker = undefined, parallelism = undefined) {
	let promise = prometzel();

	let totalCount;
	let getKeyAtIndex;
	let results;

	if (typeof worker === 'number') {
		// User has provided "parallelism" as 2nd argument. Fix it.
		parallelism = worker;
		worker = undefined;
	}

	if (!worker) {
		// Fall back to a simple mapper
		worker = (p, key) => {
			if (typeof p === 'function') {
				// Execute given function with key
				return p(key);
			}
			// Otherwise, just return the value as it is. This can be a promise or any other value.
			return p;
		};
	}

	if (typeof args === 'number') {
		// "repeat" flow
		const count = args;
		args = [];
		for (let i = 0; i < count; i++) {
			args[i] = i;
		}
	}

	if (Array.isArray(args)) {
		// array flow
		totalCount = args.length;
		results = [];
		getKeyAtIndex = index => index;

		// Fall back to one at a time
		parallelism = parallelism || 1;
	} else if (typeof args === 'object' || typeof args === 'function') {
		// hash flow
		const keys = Object.keys(args);
		totalCount = keys.length;
		results = {};
		getKeyAtIndex = index => keys[index];

		// Fall back to all at once
		parallelism = parallelism || keys.length;
	} else {
		throw new TypeError(`Invalid first argument. Must be an array or hash or number.`);
	}

	let index = 0;
	let activeCount = 0;
	let error = null;

	setImmediate(next);

	return promise;

	function next() {
		if (!promise) {
			return;
		}

		if (error) {
			promise.reject(error);
			promise = null;
			return;
		}

		if (index === totalCount && activeCount === 0) {
			promise.resolve(results);
			promise = null;
			return;
		}

		if (index >= totalCount || activeCount >= parallelism) {
			// Do nothing, wait for some of promises to resolve
			return;
		}

		// Take next
		const targetIndex = index;
		const targetKey = getKeyAtIndex(targetIndex);
		const workerArg = args[targetKey];
		activeCount++;
		index++;
		Promise.resolve()
			.then(() => worker(workerArg, targetKey))
			.then(
				res => {
					results[targetKey] = res;
				},
				err => {
					if (!error) {
						error = err;
					}
				}
			)
			.finally(() => {
				activeCount--;
				next();
			});

		setImmediate(next);
	}
}

module.exports = {
	prometzel,
	promiseChain,
};
