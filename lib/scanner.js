/* ------------------------------------------------------------------
* node-beacon-scanner - scanner.js
*
* Copyright (c) 2017-2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2019-10-25
*
* Updated by Florian Quirin - 2026-03-01
* ---------------------------------------------------------------- */
'use strict';
const { withBindings: nobleWithBindings } = require('@stoprocent/noble');
const mBeaconParser = require('./parser.js');

/* ------------------------------------------------------------------
* Constructor: BeaconScanner(params)
* - params:
*     noble  : The Nobel object created by the noble module.
*              This parameter is optional. If you don't specify
*              this parameter, this module automatically creates it.
*     nobleBinding: device binding type 'default', 'hci', 'win' or 'mac'
*     nobleBindingOptions: options for a specific binding (default: null)
*     waitForAdapterPowerMs: wait this long for the 'poweredOn' event
* ---------------------------------------------------------------- */
const BeaconScanner = function (params) {
	// Public properties
	this.noble = null;
	this.nobleBinding = params?.nobleBinding || 'default';
	this.nobleBindingOptions = params?.nobleBindingOptions || null;
	this.waitForAdapterPowerMs = params?.waitForAdapterPowerMs || 5000;
	
	// noble instance
	this.noble = params?.noble;
	
	this.onadvertisement = null;
	this.onerror = null;
	this.ondebug = null;

	// Private properties
	this._initialized = false;
	this._is_scanning = false;
};

BeaconScanner.prototype._createNobleInstance = function () {
	return new Promise((resolve, reject) => {
		try {
			if (!this.noble){
				if (this.ondebug) this.ondebug("_createNobleInstance - creating instance ...");
				this.noble = this.nobleBindingOptions
					? nobleWithBindings(this.nobleBinding, this.nobleBindingOptions)
					: nobleWithBindings(this.nobleBinding);
			}
			//await this.noble.waitForPoweredOnAsync(this.waitForAdapterPowerMs);
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

/* ------------------------------------------------------------------
* Method: destroyInstance()
* ---------------------------------------------------------------- */
BeaconScanner.prototype.destroyInstance = function () {
	if (this.ondebug) this.ondebug("destroyInstance - destroying instance ...");
	try {
		if (this._is_scanning) {
			this.stopScan();
		}
	} catch (err) {}
	this.noble?.reset();
	this.noble?.stop();
	this.noble = null;
	if (this.ondebug) this.ondebug("destroyInstance - done");
};

/* ------------------------------------------------------------------
* Method: stopScan()
* ---------------------------------------------------------------- */
BeaconScanner.prototype.stopScan = function () {
	if (this.ondebug) this.ondebug("stopScan - stopping ...");
	this.noble?.removeAllListeners('discover');
	this.noble?.removeAllListeners('stateChange');
	if (this._is_scanning) {
		this.noble?.stopScanning();
		this._is_scanning = false;
		if (this.ondebug) this.ondebug("stopScan - stopped");
	}
};

/* ------------------------------------------------------------------
* Method: startScan()
* ---------------------------------------------------------------- */
BeaconScanner.prototype.startScan = function () {
	let promise = new Promise((resolve, reject) => {
		if (this._is_scanning) {
			resolve();
			return;
		}
		if (this.ondebug) this.ondebug("startScan - starting ...");
		this._createNobleInstance().then(() => {
			return this._init();
		}).then(() => {
			if (this.ondebug) this.ondebug("startScan - adapter is ON");
			return this._prepareScan();
		}).then(() => {
			if (this.ondebug) this.ondebug("startScan - scanning");
			this._observerPowerState();
			resolve();
		}).catch((err) => {
			if (this.ondebug) this.ondebug("startScan error: " + (err.message || err.name));
			reject(err);
			this.destroyInstance();
		});
	});
	return promise;
};

BeaconScanner.prototype._observerPowerState = function () {
	this.noble.removeAllListeners('stateChange');
	this.noble.once('stateChange', (state) => {
		if (this.ondebug) this.ondebug("_observerPowerState - state: " + state);
		//error handler
		if (['poweredOff', 'unknown', 'resetting'].includes(state)) {
			if (this.onerror) this.onerror({name: "AdapterStateError",
				message: ("Adapter switched to state '" + state + "'.")});
		}
		//NOTE: currently (v0.3.0, noble 2.3.16) there is a bug that seems to kill
		//		the adapter once after a power ON-OFF-ON sequence and it cannot be
		//		avoided even with a new instance.
	});
};

BeaconScanner.prototype._prepareScan = function () {
	let promise = new Promise((resolve, reject) => {
		if (this.ondebug) this.ondebug("_prepareScan");
		this.noble.startScanning([], true, (error) => {
			if (error) {
				reject(error);
			} else {
				this.noble.on('discover', (peripheral) => {
					if (this.onadvertisement && typeof (this.onadvertisement) === 'function') {
						let parsed = this.parse(peripheral);
						if (parsed) {
							this.onadvertisement(parsed);
						}
					}
				});
				this._is_scanning = true;
				resolve();
			}
		});
	});
	return promise;
};

BeaconScanner.prototype._init = function () {
	let promise = new Promise((resolve, reject) => {
		this._initialized = false;
		if (this.ondebug) this.ondebug("_init");
		if (this.noble.state == 'poweredOn') {
			this._initialized = true;
			resolve();
		} else {
			this.noble.waitForPoweredOnAsync(this.waitForAdapterPowerMs).then(() => {
				this._initialized = true;
				resolve();
			}).catch((err) => {
				if (this.ondebug) this.ondebug("_init - failed: " + err.name + " - " + err.message);
				reject({name: "AdapterInitError", message: ("Failed to initialize BLE adapter. Current state: " + this.noble.state)});
			});
		}
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: parse(peripheral)
* - buf: `Peripheral` object of the noble)
* ---------------------------------------------------------------- */
BeaconScanner.prototype.parse = function (peripheral) {
	return mBeaconParser.parse(peripheral);
};

module.exports = BeaconScanner;
