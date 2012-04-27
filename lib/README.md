# node-cqrs

node-cqrs is a library which aims to make it simple to implement CQRS (Command/Query Responsibility Segregation) based applications on the node.js platform.

Implementing CQRS usually, but not necessarily, involves event sourcing.

## EventSourcing

The domain side in a CQRS based application will be event sourced, meaning that object state is described by an event stream, rather than by a snapshot of the data in a database.

## Command Execution

Command execution happens by a service first using the repository to revive an agregate root. The aggregate root's state is brought back by replaying an event stream. When the object is current, commands are executed on it. These commands can lead to one or more events, which are responsible for mutating the object's state. Finally the service code will save the aggregate back to the repository.

When events for an aggregate are saved, the event store first has to veirfy that the expected target version of the aggregate (as seen by the client when the object was mutated) is the latest. If it is not, a ConcurrencyException is thrown by the event store, indicating to the repository that an event merge will have to be made. The event merge is a synchronous process which requires each of the client caused events to be merged against all events which have arrived between the point in time at which the object was fetched from the repository and the point in time at which the object was attempted saved back to the repo.

### Batching Commands

Commands can be batched from client to server, simply by having the client load an aggregate once, execute all commands and only then to save it back to the repository.

Cross-aggregate command batches isn't currently within the scope of node-cqrs.