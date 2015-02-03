 /* jshint expr:true */
"use strict";

var SocketMaster = source('socket-master');

describe('SocketMaster', function() {
  var sm, mcp;

  beforeEach(function() {
    mcp = {
      robots: {
        rosie: {
          name: 'rosie',
          devices: {
            led: {
              commands: {
                turn_on: function() { return 1; }
              },
              events: ['analogRead']
            }
          }
        },
        thelma: {
          devices: {
            asensor: {
              commands: {
                turn_on: function() {}
              },
              events: ['analogRead']
            }
          }
        }
      }
    };
    sm = new SocketMaster({}, mcp);
    stub(console, "log");
  });

  afterEach(function() {
    console.log.restore();
  });

  describe('#constructor', function() {
    it('sets @http', function() {
      expect(sm.http).to.be.eql({});
    });

    it('sets @io', function() {
      expect(sm.io).to.be.eql({});
    });

    it('sets @mcp', function() {
      expect(sm.mcp).to.be.eql(mcp);
    });

    it('sets @nsp', function() {
      expect(sm.nsp).to.be.eql({});
    });
  });

  describe('#start', function() {
    var io, socket;

    beforeEach(function() {
      io = {
        on: stub()
      };

      socket = {
        on: stub()
      };

      io.on.yields(socket);
      socket.on.yields();

      stub(sm, '_io').returns(io);
      stub(sm, 'socketMCP').returns(io);
      stub(sm, 'socketRobots').returns(io);
      stub(sm, 'socketDevices').returns(io);

      sm.start();
    });

    afterEach(function() {
      sm._io.restore();
      sm.socketMCP.restore();
      sm.socketRobots.restore();
      sm.socketDevices.restore();
    });

    it('calls #_io', function() {
      expect(sm._io).to.be.calledOnce;
    });

    it('sets #io', function() {
      expect(sm.io).to.be.eql(io);
    });

    it('sets listener for #io#on "connection"', function() {
      expect(sm.io.on).to.be.calledWith('connection');
    });

    it('sets listeners for #socket#on "disconnect"', function() {
      expect(socket.on).to.be.calledWith('disconnect');
    });

    it('sets listeners for #socket#on "disconnect"', function() {
      expect(console.log).to.be.calledWith('A user disconnected');
    });

    it('calls  #socketMCP', function() {
      expect(sm.socketMCP).to.be.calledOnce;
    });

    it('calls  #socketRobots', function() {
      expect(sm.socketRobots).to.be.calledOnce;
      expect(sm.socketRobots).to.be.calledWith(mcp.robots);
    });

    it('calls  #socketDevices', function() {
      expect(sm.socketDevices).to.be.calledTwice;
      expect(sm.socketDevices).to.be.calledWith(mcp.robots.rosie);
      expect(sm.socketDevices).to.be.calledWith(mcp.robots.thelma);
    });
  });

  describe('#_socketItems', function() {
    var callback, nsp, socket;

    beforeEach(function() {
      socket = {
        on: stub()
      };

      nsp = {
        on: stub()
      };

      socket.on.yields();
      nsp.on.yields(socket);

      callback = spy();
      sm.io.of = stub();
      sm.io.of.returns(nsp);

      sm._socketItems('/api/robots/', mcp.robots, callback);
    });

    it('calls #io#of once per robot', function() {
      expect(sm.io.of).to.be.calledWith('/api/robots/rosie');
      expect(sm.io.of).to.be.calledWith('/api/robots/thelma');
    });

    it('sets nsps for all robots', function() {
      expect(sm.nsp.rosie).to.be.eql(nsp);
      expect(sm.nsp.thelma).to.be.eql(nsp);
    });

    it('sets listeners for "connection" event on nsps', function() {
      expect(sm.nsp.rosie.on).to.be.calledWith('connection');
      expect(sm.nsp.thelma.on).to.be.calledWith('connection');
    });

    it('sets listeners for socket "disconnect" event', function() {
      expect(socket.on).to.be.calledWith('disconnect');
    });

    it('triggers the callback', function() {
      expect(callback).to.be.calledWith(socket, 'rosie', mcp.robots.rosie);
      expect(callback).to.be.calledWith(socket, 'thelma', mcp.robots.thelma);
    });
  });

  describe('#socketMCP', function() {
    var callback, socket;

    beforeEach(function() {
      callback = spy();

      socket = {
        on: stub()
      };

      socket.on.yields();
      stub(sm, '_socketItems');

      sm.nsp = {
        robots: {
          emit: stub()
        },
        rosie: {
          emit: stub()
        }
      };

      sm._socketItems.yields(socket, 'robots', mcp.robots);

      sm.socketMCP();
    });

    afterEach(function() {
      sm._socketItems.restore();
    });

    it('calls #_socketItems', function() {
      expect(sm._socketItems).to.be.calledWith(
        '/api/',
        { robots: mcp.robots }
      );
    });

    it('adds a listener for robots to the socket', function() {
      expect(socket.on).to.be.calledWith('robots');
    });

    it('emits "robots" event with params', function() {
      expect(sm.nsp.robots.emit).to.be.calledTwice;
      expect(sm.nsp.robots.emit).to.be.calledWith(
        'robots',
        ['rosie', 'thelma']
      );
    });
  });

  describe('#socketRobots', function() {
    var callback, socket;

    beforeEach(function() {
      callback = spy();

      socket = {
        on: stub()
      };

      socket.on.yields();
      stub(sm, '_socketItems');

      sm.nsp = {
        robots: {
          emit: stub()
        },
        rosie: {
          emit: stub()
        }
      };

      sm._socketItems.yields(socket, 'rosie', mcp.robots.rosie);

      sm.socketRobots(mcp.robots);
    });

    afterEach(function() {
      sm._socketItems.restore();
    });

    it('calls #_socketItems', function() {
      expect(sm._socketItems).to.be.calledWith(
        '/api/robots/',
        mcp.robots
      );
    });

    it('adds a listener for "devices" to the socket', function() {
      expect(socket.on).to.be.calledWith('devices');
    });

    it('emits "devices" event', function() {
      expect(sm.nsp.rosie.emit).to.be.calledTwice;
      expect(sm.nsp.rosie.emit).to.be.calledWith(
        'devices',
        ['led']
      );
    });
  });

  describe('#socketDevices', function() {
    var callback, socket, asensor;

    beforeEach(function() {
      callback = spy();

      socket = {
        on: stub()
      };

      socket.on.yields({ command: 'turn_on', args: []});

      stub(sm, '_socketItems');

      sm.nsp = {
        robots: {
          emit: stub()
        },
        rosie: {
          emit: stub()
        },
        led: {
          emit: stub()
        },
      };

      asensor = mcp.robots.rosie.devices.led;
      asensor.on = stub();
      asensor.on.yields();

      sm._socketItems.yields(socket, 'led', mcp.robots.rosie.devices.led);

      sm.socketDevices(mcp.robots.rosie);
    });

    afterEach(function() {
      sm._socketItems.restore();
    });

    it('calls #_socketItems', function() {
      expect(sm._socketItems).to.be.calledWith(
        '/api/robots/rosie/devices/',
        mcp.robots.rosie.devices
      );
    });

    it('adds a listener for "message" to the socket', function() {
      expect(socket.on).to.be.calledWith('message');
    });

    it('emits "message" event', function() {
      expect(sm.nsp.led.emit).to.be.calledWith('message');
    });

    it('adds a listener for "commands" to the socket', function() {
      expect(socket.on).to.be.calledWith('commands');
    });

    it('emits "commands" event', function() {
      expect(sm.nsp.led.emit).to.be.calledWith(
        'commands',
        ['turn_on']
      );
    });

    it('adds a listener for "events" to the socket', function() {
      expect(socket.on).to.be.calledWith('events');
    });

    it('emits "events" event', function() {
      expect(sm.nsp.led.emit).to.be.calledWith(
        'events',
        mcp.robots.rosie.devices.led.events
      );
    });

    it('adds a listener for "command" to the socket', function() {
      expect(socket.on).to.be.calledWith('command');
    });

    it('emits "events" event', function() {
      expect(sm.nsp.led.emit).to.be.calledWith(
        'command',
        'turn_on',
        1
      );
    });

    it('adds a listener for "turn_on" to the socket', function() {
      expect(socket.on).to.be.calledWith('turn_on');
    });

    it('emits "events" event', function() {
      expect(sm.nsp.led.emit).to.be.calledWith(
        'turn_on',
        1
      );
    });

    it('adds a listener for "analogRead" to the device', function() {
      expect(asensor.on).to.be.calledWith('analogRead');
    });

    it('emits "events" event', function() {
      expect(sm.nsp.led.emit).to.be.calledWith(
        'analogRead'
      );
    });
  });
});