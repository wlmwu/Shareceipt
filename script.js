class Friend {
    static nextId = 1;

    constructor(name) {
        this.id = Friend.nextId++;
        this.name = name;
        this.rgb = this.generateRandomRgb();
    }
    
    generateRandomRgb() {
        // Helper function to generate a random integer between min and max
        const getRandomIntInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        const values = [
            getRandomIntInRange(50, 150),
            getRandomIntInRange(30, 100),
        ];
        values.push(Math.min(220, 350 - values[0] - values[1]));
        values.sort(() => Math.random() - 0.5);

        return { r: values[0], g: values[1], b: values[2] };
    }

    get rgbString() {
        return `rgb(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b})`;
    }
}

const ItemType = Object.freeze({
    kTypePercent:   0,
    kTypeShare:  1
});

class Item {
    static nextId = 1;
    
    constructor(name = '', amount) {
        this.id = Item.nextId++;
        this.name = name;
        this.amount = parseFloat(amount);
        this.participants = new Map(); // Map of Friend ID to percentage
        this.unitType = ItemType.kTypePercent;
    }

    setParticipant(friendId, percentage, checked=true) {
        // console.log('set participant', this.id, friendId, percentage);
        if (!Number.isInteger(friendId)) return;
        if (percentage === undefined) percentage = NaN;

        this.participants.set(friendId, { percentage: parseFloat(percentage), checked: checked });
    }

    removeParticipant(friendId) {
        // console.log('rmv participant', this.id, friendId);
        if (!Number.isInteger(friendId)) return;
        this.participants.delete(friendId);
    }

    getParticipantPercentage(friendId) {
        const res = this.participants.get(friendId);
        if (res) return res.percentage;
        else return res;
    }

    getTotalPercentage() {
        return Array.from(this.participants.values()).map(p => p.percentage).reduce((accumulator, currentValue) => {
            return !isNaN(currentValue) ? accumulator + currentValue : accumulator;
        }, 0);
    }

    getParticipantChecked(friendId) {
        const res = this.participants.get(friendId);
        if (res) return res.checked;
        else return res;
    }

    getNumNaNParticipant() {
        return Array.from(this.participants.values())
                        .map(p => p.percentage)
                        .reduce((accumulator, currentValue) => accumulator + (isNaN(currentValue) ? 1 : 0), 0);
        
    }

    switchUnitType() {
        this.unitType = this.unitType == ItemType.kTypePercent ? ItemType.kTypeShare : ItemType.kTypePercent;
    }

    getUnitType() {
        return this.unitType;
    }

}

class FriendManager {
    constructor() {
        this.friends = new Map();
        this.items = new Map();
        this.friendListElement = $('#friends-list');
        this.itemsListElement = $('#items-list');
        this.initializeFriends();
        this.initializeItems();
        this.attachEventListeners();
    }

    initializeFriends() {
        this.friendListElement.empty();
        this.addFriend('Friend 1');
    }
    initializeItems() {
        this.itemsListElement.empty();
        this.addItem();
    }

    addFriend(name) {
        const friend = new Friend(name);
        this.friends.set(friend.id, friend);
        this.updateFriendList();
    }

    removeFriend(id) {
        this.friends.delete(id);
        this.updateFriendList();
    }

    updateFriendList() {
        const existingFriendIds = new Set(this.friends.keys());
        this.friendListElement.children('.friend').each((_, div) => {
            const id = parseInt($(div).find('.friend-name').data('id'), 10);
            if (!existingFriendIds.has(id)) {
                $(div).remove();
            }
        });

        this.friends.forEach(friend => {
            let friendElement = this.friendListElement.find(`.friend-name[data-id="${friend.id}"]`);
            if (!friendElement.length) {
                this.friendListElement.append(`
                    <div class="friend">
                        <span class="friend-name" data-id="${friend.id}" style="border: 2px solid ${friend.rgbString};">${friend.name}</span>
                        <button class="delete-btn" data-id="${friend.id}"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `);
            } else {
                friendElement[0].innerHTML = friend.name;
            }
        });

        this.bindFriendEvents();
        this.updateItemFriends();
    }

    updateItemFriends() {
        const numFriends = this.friends.size;

        this.itemsListElement.find('.item').each((index, itemDiv) => {
            const itemId = parseInt($(itemDiv).find('input[type="text"]').attr('id').split('-').pop());
            let item = this.items.get(itemId);

            const itemFriendsDiv = $(`#item-friends-${itemId}`);

            // remove friends removed
            const existingFriendIds = new Set(this.friends.keys());
            itemFriendsDiv.children('.item-friend').each((_, div) => {
                let friendId = parseInt($(div).find('label').attr('for').split('-')[3]);
                if (!existingFriendIds.has(friendId)) {
                    $(div).remove();
                    item.removeParticipant(friendId);
                }
            });

            // add friends added
            this.friends.forEach(friend => {
                if (!itemFriendsDiv.find(`.item-friend input[id="item-${itemId}-friend-${friend.id}"]`).length) {
                    itemFriendsDiv.append(`
                        <div class="item-friend">
                            <input type="checkbox" id="item-${itemId}-friend-${friend.id}" checked>
                            <label for="item-${itemId}-friend-${friend.id}" class="item-friend-name" style="border: 1.5px solid black; border-radius: 6px; background-color:${friend.rgbString};" >
                            </label>
                        </div>
                    `);
                }
            });

            itemFriendsDiv.children('.item-friend').each((_, div) => {
                let itemId = parseInt($(div).find('label').attr('for').split('-')[1]);
                let friendId = parseInt($(div).find('label').attr('for').split('-')[3]);
                let item = this.items.get(itemId)
                const percentage = item.getParticipantPercentage(friendId);
                let friend = this.friends.get(friendId);

                $($(div).find('label')).html( `
                    <div class="text-center align-middle">
                        <div class="d-block d-sm-inline">${friend.name}&emsp;</div>
                        <div class="d-inline">
                            <input type="number" value="${percentage}" min="0" max="100" step="1" class="percentage-input" ${item.getParticipantChecked(friendId) === false ? "disabled" : ""}> 
                            ${item.getUnitType() == ItemType.kTypePercent ? '%' : 'share(s)'}
                        </div>
                    </div>
                `);
                // $(div).find('input[type="number"]')[0].placeholder = Math.round(100 / numFriends * 100) / 100;
                item.setParticipant(friendId, percentage, percentage === undefined ? true : item.getParticipantChecked(friendId));
                this.bindItemEvents();
            });
        });
        this.calculate();
    }

    addItem(name = '', amount) {
        const item = new Item(name, amount);
        this.items.set(item.id, item)
        this.updateItemsList();
    }

    removeItem(id) {
        this.items.delete(id);
        this.updateItemsList();
    }

    updateItemsList() {
        const existingItems = new Set(this.items.keys());
        this.itemsListElement.children('.item').each((_, div) => {
            const id = parseInt($(div).data('id'), 10);
            if (!existingItems.has(id)) {
                $(div).remove();
            }
        });
        
        let index = 1;
        this.items.forEach((item, key) => {
            let itemElement = this.itemsListElement.find(`.item[data-id="${item.id}"]`);
            if (!itemElement.length) {
                this.itemsListElement.append(`
                    <div class="item p-sm-2"  data-id="${item.id}">
                        <button class="collapse-btn" data-bs-toggle="collapse" data-bs-target="#item-container-${item.id}" aria-expanded="true" aria-controls="item-container-${item.id}">
                            <i style="font-size:24px" class="fa">&#xf107;</i>
                        </button>
                        <button class="delete-btn"><i class="fa-solid fa-xmark"></i></button>
                        <div class="item-head">&emsp;</div>
                        <div class="item-container collapse show" id="item-container-${item.id}">
                            <label for="item-name-${item.id}" class="item-title">Item #${index} Name</label>
                            <input type="text" class="item-name" id="item-name-${item.id}" value="${item.name}">
                            <label for="item-amount-${item.id}" class="item-title">Amount</label>
                            <input type="number" class="item-amount" id="item-amount-${item.id}" min="0" step="0.01" value="${item.amount}" placeholder="(required)">
                            <button class="button-50 unit-btn" ontouchstart=""><i class="fa-solid fa-repeat"></i> Unit</button>
                            <label for="item-friends-${item.id}"></label>
                            <div id="item-friends-${item.id}" class="item-friends"></div>
                            <div>&emsp;</div>
                        </div>
                    </div>
                `);
            } else {
                $($(itemElement).find('label')[0]).html(`Item #${index} Name`);
            }
            index++;
        });
        this.updateItemFriends();
    }

    bindFriendEvents() {
        this.friendListElement.off('click', '.delete-btn').on('click', '.delete-btn', (event) => {
            const id = $(event.currentTarget).data('id');
            this.removeFriend(id);
        });
        this.friendListElement.off('click', '.friend-name').on('click', '.friend-name', (event) => {
            const id = $(event.currentTarget).data('id');
            this.editName(id);
        });
    }

    bindItemEvents() {
        $('#items-list .item .delete-btn').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.item').data('id'));
            this.removeItem(itemId);
            if (this.items.size == 0) {
                $('#items-list').hide();
            }
        });

        $('#items-list .item .item-container').off('hide.bs.collapse').on('hide.bs.collapse', (e) => {
            const itemdiv = $(e.target).closest('.item');
            const collapseBtn = itemdiv.find('.collapse-btn');
            // $(collapseBtn).html(`✚`);
            $(collapseBtn).html(`<i style="font-size:24px" class="fa">&#xf106;</i>`);

            let head = itemdiv.find('.item-head');
            let name = itemdiv.find('.item-name')[0].value;
            let amount = itemdiv.find('.item-amount')[0].value;
            head.html(`${name ? name : ""}&emsp;&emsp; ${amount ? "$ "+amount : ""}`)
        });
        
        $('#items-list .item .item-container').off('show.bs.collapse').on('show.bs.collapse', (e) => {
            const itemdiv = $(e.target).closest('.item');
            const collapseBtn = itemdiv.find('.collapse-btn');
            // $(collapseBtn).html( `▬` );
            $(collapseBtn).html( `<i style="font-size:24px" class="fa">&#xf107;</i>` );
            let head = itemdiv.find('.item-head');
            head.html(`&emsp;`);
        });

        $('#items-list .item .distribute-btn').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.item').data('id'));
            this.autoDistribute(itemId);
        });

        $('#items-list .item .unit-btn').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.item').data('id'));
            this.switchUnit(itemId);
        });

        $('#items-list .item-friends input[type="number"]').off('focus').on('focus', (e) => {
            const itemId = parseInt($(e.target.closest('label')).attr('for').split('-')[1]);
            const friendId = parseInt($(e.target.closest('label')).attr('for').split('-')[3]);
            $(e.target).val('');

            this.items.get(itemId).setParticipant(friendId, NaN);
            this.calculate();
        });

        $('#items-list input[type="number"]').off('input').on('input', (e) => {
            const itemId = parseInt(e.target.id.split('-')[2]);
            this.items.get(itemId).amount = parseFloat(e.target.value);
            this.calculate();
        });

        $('#items-list .item-friends input[type="checkbox"]').off('change').on('change', function(e) {
            const itemId = parseInt(e.target.id.split('-')[1]);
            const friendId = parseInt(e.target.id.split('-')[3]);
            const check = $(`#${e.target.id}`)[0].checked;
            const input = $(`#${e.target.id}`).closest('.item-friend').find('.percentage-input')[0];
            input.disabled = !check;
            input.value = check ? NaN : 0 ;
            this.items.get(itemId).setParticipant(friendId, input.value, check);
            this.calculate();
        }.bind(this));

        $('#items-list .item-friends .percentage-input').off('input').on('input', function(e) {
            const itemId = parseInt($(e.target).closest('label').attr('for').split('-')[1]);
            const friendId = parseInt($(e.target).closest('label').attr('for').split('-')[3]);
            const input = parseFloat(e.target.value);
            this.items.get(itemId).setParticipant(friendId, input);
            this.calculate();
        }.bind(this));

        $('#total-amount').off('input').on('input', () => this.calculate());
        $('#subtotal-amount').off('input').on('input', () => this.calculate());
    }

    calculate() {
        $('#results-alert').html('');
        if (this.items.size == 0 && ($('#subtotal-amount').val() > 0 || $('#total-amount-additional').val() > 0)) {
            $('#results-alert').append(`[Error] Adding items to calculate.`);
        }

        let totalAmount = parseFloat($('#total-amount').val());
        let amountOfItems = Array.from(this.items.values()).map(item => item.amount);
        totalAmount = totalAmount ? totalAmount : 
            amountOfItems.reduce((accumulator, currentValue) => {
            return !isNaN(currentValue) ? accumulator + currentValue : accumulator;
        }, 0);
        
        let results = new Map(
            Array.from(this.friends, ([key, obj]) => [key, 0])
        );

        const calculatePercentage = (index, item, id, results) => {
            const totalPercentage = item.getTotalPercentage();
            if (totalPercentage > 100) {
                $('#results-alert').append(`[Error] Item #${index} exceed a total of 100%.<br>`);
                return;
            }
            const remainPercentage = 100 - item.getTotalPercentage();
            const countNaN = item.getNumNaNParticipant();
            if (!item.amount) {
                if (countNaN < item.participants.size) {
                    $('#results-alert').append(`[Error] "Amount" of item #${index} is empty.<br>`);
                }
                return;
            }
            if (remainPercentage && !countNaN) {
                $('#results-alert').append(`[Error] Item #${index} do not sum to 100%.<br>`);
                return;
            }
            item.participants.forEach((_, fid) => {
                if (item.getParticipantChecked(fid)) {
                    const percentage = item.getParticipantPercentage(fid) || remainPercentage/countNaN;
                    const itemfriendInput = $(`label[for="item-${item.id}-friend-${fid}"]`).find('input');
                    itemfriendInput.attr('placeholder', percentage);
                    const amount = item.amount * percentage / 100 + results.get(fid);
                    results.set(fid, amount);
                }
            });
        };

        const calculateShare = (index, item, id, results) => {
            const totalShare = item.getTotalPercentage();
            if (totalShare <= 0) {
                $('#results-alert').append(`[Error] Item #${index} is completely empty.<br>`);
                return;
            }
            item.participants.forEach((_, fid) => {
                if (item.getParticipantChecked(fid)) {
                    const share = item.getParticipantPercentage(fid) || 0;
                    const itemfriendInput = $(`label[for="item-${item.id}-friend-${fid}"]`).find('input');
                    itemfriendInput.attr('placeholder', 0);
                    const amount = item.amount * share / totalShare + results.get(fid);
                    results.set(fid, amount);
                }
            });

        }

        let index = 0;
        this.items.forEach((item, iid) => {
            ++index;
            // if (!item.amount) return;
            if (item.getUnitType() == ItemType.kTypePercent) {
                calculatePercentage(index, item, iid, results);
            } else {
                calculateShare(index, item, iid, results);
            }
            
        });

        // console.log(totalAmount, results);
        this.showResult(totalAmount, results);
        return [totalAmount, results];
    }

    showResult(totalAmount, results) {
        $('#subtotal-amount').attr("placeholder", totalAmount);
        const originalAmount = parseFloat($('#subtotal-amount').val() ? $('#subtotal-amount').val() : $('#subtotal-amount').attr('placeholder'));
        const additionalAmount = parseFloat($('#total-amount-additional').val() || 0) / 100;
        totalAmount = (originalAmount * (1 + additionalAmount));
        $('#total-amount').html(totalAmount.toFixed(2));

        const resultTotal = Array.from(results.values()).reduce((accumulator, currentValue) => accumulator + currentValue, 0);

        const resultsOutput = $('#results-output');
        resultsOutput.html('');
        this.friends.forEach((friend, fid) => {
            const totalAmountOwed = totalAmount * results.get(fid) / resultTotal;
            resultsOutput.append(`
                <div>
                    <span class="result-output-friend friend-name" style="background-color:${friend.rgbString}">${friend.name}&emsp;$${isNaN(totalAmountOwed) ? 0 : totalAmountOwed.toFixed(2)}</span>
                </div>
                `);
        });
    }

    getShareResults () {
        const [totalAmount, results] = this.calculate();
        const resultTotal = Array.from(results.values()).reduce((accumulator, currentValue) => accumulator + currentValue, 0);

        let resStr = "";
        this.friends.forEach((friend, fid) => {
            const totalAmountOwed = totalAmount * results.get(fid) / resultTotal;
            // console.log(friend.name, totalAmountOwed);
            resStr = resStr.concat(`${friend.name}:\t$${isNaN(totalAmountOwed) ? 0 : totalAmountOwed.toFixed(2)}\n`);
            // console.log(resStr)
        });

        return resStr;
    }

    autoDistribute(itemId) {
        let item = this.items.get(itemId);
        const remainPercentage = 100 - item.getTotalPercentage();
        const countNaN = Array.from(item.participants.values())
                            .map(p => p.percentage)
                            .reduce((accumulator, currentValue) => accumulator + (isNaN(currentValue) ? 1 : 0), 0);
        
        item.participants.forEach((_, id) => {
            if (item.getParticipantChecked(id) && isNaN(item.getParticipantPercentage(id))) {
                item.setParticipant(id, remainPercentage/countNaN);
            }
        });
        this.updateItemFriends();
    }

    switchUnit(itemId) {
        this.items.get(itemId).switchUnitType();
        this.updateItemsList();
    }

    bindAmountEvents() {
        $('#total-amount-additional').off('focus').on('focus', (e) => {
            $(e.target).val('');
            this.calculate();
        });
        $('#subtotal-amount').off('focus').on('focus', (e) => {
            $(e.target).val('');
            this.calculate();
        });

        $('#total-amount-additional').off('input').on('input', () => this.calculate());
        $('#subtotal-amount').off('input').on('input', () => this.calculate());
        $('#detail-amount-container').off('hide.bs.collapse').on('hide.bs.collapse', (e) => {
            $('.total-amount-container .collapse-btn .fa-angle-down').hide();
            $('.total-amount-container .collapse-btn .fa-angle-right').show();         
        });
        $('#detail-amount-container').off('show.bs.collapse').on('show.bs.collapse', (e) => {
            $('.total-amount-container .collapse-btn .fa-angle-down').show();
            $('.total-amount-container .collapse-btn .fa-angle-right').hide();
        });
    }

    attachEventListeners() {
        $('#add-friend').on('click', () => {
            this.addFriend(`Friend ${Friend.nextId}`);
        });

        $('#add-item').on('click', () => {
            this.addItem();
            $('#items-list').show();
        });

        $('#share-result-btn').on('click', async () => {
            try {
                const res = this.getShareResults();
                const shareData = {
                    title: 'Share the results!',
                    text: `↓ Each Person's Share ↓\n\n${res}`,
                    url: document.location.href
                };
                await navigator.share(shareData)
            } catch(err) {
                console.log( 'Error: ' + err );
            }
        });

        this.bindAmountEvents();
    }

    editName(id) {
        const friend = this.friends.get(id);
        if (friend) {
            const newName = prompt('Rename:', friend.name);
            if (newName) {
                friend.name = newName;
                this.updateFriendList();
            }
        }
        // console.log(friend);
    }
}


// Initialize the friend manager when the document is ready
const friendManager = new FriendManager();
